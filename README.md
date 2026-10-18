# Cold-Chain Guardian

IoT-based cold-chain monitoring and alert system. ESP32 sensors, MQTT, Node.js, MongoDB, and a React dashboard.

Educational prototype. Not a certified medical or regulatory cold-chain device. The battery percentage is an
estimate from voltage, and the risk score is a project-defined indicator, not a validated damage probability.

## Structure
- `mqtt/` Docker Compose for Mosquitto and MongoDB (host ports 1893 and 27117)
- `backend/` Express, Mongoose, MQTT ingestion, alert engine, Socket.IO (port 5055)
- `simulator/` synthetic telemetry through the real MQTT path (device IDs start with SIM-)
- `frontend/` Vite, React, Tailwind v4 (port 5175)
- `firmware/` ESP32 firmware (built after the software is verified)
- `docs/` architecture, API, MQTT, risk score, testing, troubleshooting, deployment

## Requirements
Node.js 20 or newer, Docker Desktop, and optionally a Google Maps key for the map.

## First-time setup
```bash
cd mqtt && docker compose up -d
cd ../backend && npm install && cp .env.example .env
cd ../simulator && npm install
cd ../frontend && npm install && cp .env.example .env
```
On Windows CMD use `copy` instead of `cp`.

## Run (four terminals)
```bash
cd mqtt && docker compose up -d
cd backend && npm run dev
cd frontend && npm run dev
cd backend && node scripts/seedShipment.js SIM-001
cd simulator && node src/index.js --scenario demo --loop --interval 3
```
Open http://localhost:5175 (not 127.0.0.1, because of the CORS setting).

## Tests
```bash
cd backend && npm test
cd simulator && npm test
```

## Ports
| Service | Port |
|---|---|
| Backend API and Socket.IO | 5055 |
| Frontend | 5175 |
| MongoDB (host) | 27117 |
| Mosquitto (host) | 1893 |

## Security status
Local development only. The broker allows anonymous access and the API has no login. See `docs/deployment.md`
before exposing anything to a network.