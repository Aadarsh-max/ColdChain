import { io } from 'socket.io-client';
import { API_URL, notifyUnauthorized } from '../api/client.js';
import { getToken } from '../api/token.js';

export const socket = io(import.meta.env.VITE_SOCKET_URL || API_URL, {
  transports: ['websocket'],
  autoConnect: false,
  reconnectionDelayMax: 5000,
  auth: (callback) => callback({ token: getToken() })
});

socket.on('connect_error', (err) => {
  if (err && err.message === 'unauthorized') notifyUnauthorized();
});