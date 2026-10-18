import { io } from 'socket.io-client';
import { API_URL } from '../api/client.js';

export const socket = io(import.meta.env.VITE_SOCKET_URL || API_URL, {
  transports: ['websocket'],
  autoConnect: false,
  reconnectionDelayMax: 5000
});