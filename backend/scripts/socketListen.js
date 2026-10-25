import { io } from 'socket.io-client';

const url = process.argv[2] || 'http://localhost:5055';
const email = process.env.SOCKET_EMAIL || '';
const password = process.env.SOCKET_PASSWORD || '';

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

const getToken = async () => {
  const res = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body && body.error ? body.error.message : 'Login failed');
  return body.data.token;
};

const main = async () => {
  if (!email || !password) throw new Error('Set SOCKET_EMAIL and SOCKET_PASSWORD first');
  const token = await getToken();
  const socket = io(url, { transports: ['websocket'], auth: { token } });

  socket.on('connect', () => console.log(`Connected as ${socket.id}`));
  socket.on('connect_error', (err) => console.log(`Connect error: ${err.message}`));
  socket.on('disconnect', (reason) => console.log(`Disconnected: ${reason}`));

  for (const name of events) {
    socket.on(name, (payload) => console.log(name, JSON.stringify(payload).slice(0, 220)));
  }
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});