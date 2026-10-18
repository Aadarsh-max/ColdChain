# REST API

Base URL `http://localhost:5055/api`. Lists return `{ data, meta }`, single items `{ data }`, errors
`{ error: { message, details? } }`. Pagination: `page`, `limit` (max 500). Date range: `from`, `to` (ISO, max 90 days
for series and CSV).

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | 200 ok, 503 when the database is down |
| GET | `/devices` | filters `status`, `isSimulated` |
| GET | `/devices/:id` | overview, location status, sync, active alerts |
| GET | `/devices/:id/latest` | latest reading and staleness |
| GET | `/devices/:id/readings` | `from`, `to`, `shipmentId`, `dataSource`, `isSimulated`, `sort` |
| GET | `/devices/:id/events` | alerts for one device: `type`, `severity`, `status`, `acknowledged` |
| GET | `/devices/:id/series` | aggregated chart data, limits, gaps, excursions, stats |
| GET | `/shipments` | `status`, `deviceId`, `search`, `isSimulated` |
| POST | `/shipments` | create, 409 if the device is on another active shipment |
| GET | `/shipments/:id` | detail with risk score |
| PATCH | `/shipments/:id` | update, status changes append to history |
| GET | `/shipments/:id/history` | status history, route, stats, alerts |
| GET | `/shipments/:id/readings` | telemetry of the shipment |
| GET | `/alerts` | `deviceId`, `shipmentId`, `type`, `severity`, `status`, `acknowledged`, dates |
| PATCH | `/alerts/:alertId/acknowledge` | body `{ acknowledgedBy? }` |
| GET | `/dashboard/summary` | fleet counts, alerts, risk |
| GET, PATCH | `/settings` | global thresholds and alert preferences |
| GET | `/reports/shipments/:id/summary` | summary report |
| GET | `/reports/readings.csv` | needs `deviceId` or `shipmentId` |
| GET | `/reports/alerts.csv` | optional filters |

Socket.IO events: `hello`, `telemetry:new`, `alert:opened`, `alert:updated`, `alert:closed`, `device:status`,
`device:event`, `shipment:updated`.