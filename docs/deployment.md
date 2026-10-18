# Deployment

The development setup is not safe to expose. Complete this list first.

1. **Authentication and roles.** Add login (JWT) with admin and viewer roles, and protect the REST API and Socket.IO.
   Without it, anyone who can reach the API can change settings and shipments.
2. **MQTT security.** Create a password file (`mosquitto_passwd`), set `allow_anonymous false`, give each device its own
   credentials with topic ACLs limited to `coldchain/{deviceId}/#`, and enable TLS on port 8883 with a real certificate.
   The ESP32 needs the CA certificate.
3. **HTTPS.** Put the backend and frontend behind a reverse proxy (Nginx or Caddy) with TLS. Set `CORS_ORIGIN` to the
   exact frontend origin and `NODE_ENV=production`.
4. **Database.** Use MongoDB Atlas or a MongoDB with authentication enabled, a private network, and backups.
5. **Secrets.** Keep every secret in environment variables. Never commit `.env`, Wi-Fi passwords, broker credentials,
   or the Maps key.
6. **Google Maps key.** Restrict it to your production domain and the Maps JavaScript API only, and set a budget alert.
7. **Build the frontend.** `npm run build` in `frontend/` and serve `dist/` from the proxy with `VITE_API_URL` and
   `VITE_SOCKET_URL` set to the public backend URL before building.
8. **Run the backend.** Use a process manager (PM2 or Docker) with restart on failure and log collection.
9. **Rate limits.** Review `RATE_LIMIT_MAX` for real traffic.
10. **Simulator.** Never run it against production. Its device IDs start with SIM- so its data stays separate.

This is an educational prototype. Do not use it to make decisions about real medicines or other regulated products.