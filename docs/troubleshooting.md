# Troubleshooting

| Problem | Fix |
|---|---|
| `port is already allocated` | change the left port in `mqtt/docker-compose.yml`, then update `MONGODB_URI` or `MQTT_URL` in `backend/.env` |
| `EADDRINUSE` on 5055 or 5175 | change `PORT` in `backend/.env`, or the Vite port and `CORS_ORIGIN` together |
| `MongoServerSelectionError` | start the containers: `docker compose up -d` in `mqtt/` |
| Simulator: `Could not connect` | Mosquitto is not running |
| Records stored but no alerts | the engine skips samples older than the last processed one, so restart the backend or use a new device ID |
| `shipmentId` is null | seed or assign a shipment in status At Warehouse or In Transit, then wait about 5 seconds |
| Browser CORS error | open `http://localhost:5175`, and match `CORS_ORIGIN` |
| Live Updates Off | the socket cannot connect, so check the backend and `VITE_SOCKET_URL` |
| Map says it could not load | check key, billing, the enabled Maps JavaScript API, and the referrer restriction |
| Map shows a route preview notice | `VITE_GOOGLE_MAPS_API_KEY` is empty, so restart Vite after setting it |
| Data Stale on the dashboard | no telemetry for longer than the stale threshold in Settings |
| Chart empty | no readings in the range, so use a longer range or send new data |
| 409 when saving a shipment | the device is already on another active shipment, so set that one to Delivered first |
| Unstyled page | `index.css` must contain `@import "tailwindcss";` and `vite.config.js` must include the tailwind plugin |