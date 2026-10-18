import { io } from 'socket.io-client';

const url = process.argv[2] || 'http://localhost:5055';
const socket = io(url, { transports: ['websocket'] });

const events = [
  'hello',
  'telemetry:new',
  'alert:opened',
  'alert:updated',
  'alert:closed',
  'device:status',
  'device:event',
  'shipment:updated'
];

socket.on('connect', () => console.log(`Connected as ${socket.id}`));
socket.on('connect_error', (err) => console.log(`Connect error: ${err.message}`));
socket.on('disconnect', (reason) => console.log(`Disconnected: ${reason}`));

for (const name of events) {
  socket.on(name, (payload) => console.log(name, JSON.stringify(payload).slice(0, 220)));
}