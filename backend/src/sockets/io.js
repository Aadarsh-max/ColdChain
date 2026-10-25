import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { bus, BUS_EVENTS } from '../utils/events.js';
import { authenticateToken } from '../services/authService.js';

const MAX_TIMER_MS = 2000000000;

export const attachSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 100000
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (typeof token !== 'string' || token.length === 0) return next(new Error('unauthorized'));

    try {
      const result = await authenticateToken(token);
      if (!result) return next(new Error('unauthorized'));
      socket.data.user = result.user;
      socket.data.exp = result.exp;
      return next();
    } catch (err) {
      logger.warn(`Socket auth error: ${err.message}`);
      return next(new Error('server_error'));
    }
  });

  const listeners = Object.values(BUS_EVENTS).map((name) => {
    const listener = (payload) => io.emit(name, payload);
    bus.on(name, listener);
    return [name, listener];
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (${socket.data.user.email})`);
    socket.emit('hello', { serverTime: new Date().toISOString() });

    const remainingMs = socket.data.exp * 1000 - Date.now();
    const timer = setTimeout(() => socket.disconnect(true), Math.min(Math.max(0, remainingMs), MAX_TIMER_MS));

    socket.on('disconnect', () => {
      clearTimeout(timer);
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  const detach = () => {
    for (const [name, listener] of listeners) bus.off(name, listener);
  };

  return { io, detach };
};