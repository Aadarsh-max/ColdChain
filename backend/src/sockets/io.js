import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { bus, BUS_EVENTS } from '../utils/events.js';

export const attachSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 100000
  });

  const listeners = Object.values(BUS_EVENTS).map((name) => {
    const listener = (payload) => io.emit(name, payload);
    bus.on(name, listener);
    return [name, listener];
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);
    socket.emit('hello', { serverTime: new Date().toISOString() });
    socket.on('disconnect', () => logger.debug(`Socket disconnected: ${socket.id}`));
  });

  const detach = () => {
    for (const [name, listener] of listeners) bus.off(name, listener);
  };

  return { io, detach };
};