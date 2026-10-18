# Testing

## Automated
```bash
cd backend && npm test
cd simulator && npm test
```
Covers validation, alert logic, risk score, duplicates, stale timestamps, watchdog, CSV, analytics helpers, and API
behaviour.

## Simulator scenarios
Run from `simulator/` with `node src/index.js -s <name>`.

| Spec case | Scenario | Expected |
|---|---|---|
| Normal temperature | `normal` | no alerts |
| High and low excursion | `high-excursion`, `low-excursion` | alert opens, escalates, resolves |
| Humidity changes | `humidity-change` | chart only |
| Lid opening | `lid-open` | `lid_opened` opens and closes |
| Shock | `shock` | 3 shock events, cooldown applied |
| GPS fix and no fix | `gps-fix`, `gps-no-fix`, `gps-loss` | current, none, last known |
| Low battery | `low-battery` | warning, then critical |
| Wi-Fi or MQTT disconnection | `wifi-drop` | stale alert, then sync on reconnect |
| Offline synchronization | `offline-sync --count 60` | synchronized records, original timestamps |
| Duplicate messages | `duplicates` | 12 stored, 12 duplicate acks |
| Invalid sensor values | `invalid-sensor` | nulls, sensor failure alerts |
| Backend or MongoDB down | manual | no ack, resend, 0 unacknowledged at the end |

## Manual UI checks
Every page loads without console errors, stopping the backend shows Backend Unreachable, stale data shows the amber
banner, and no page ever shows 0,0 or a substituted reading.

## Hardware
Hardware tests are added with the firmware. Nothing is claimed to work on hardware until it has been tested.