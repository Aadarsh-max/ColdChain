# Architecture

```
ESP32 sensors ──MQTT──> Mosquitto ──> Backend ──> MongoDB
(or simulator)             ^            │
                           │            ├── REST API ──> React dashboard
                           └── ack ─────┘── Socket.IO ──>
```

## Data flow
1. The device publishes JSON to `coldchain/{deviceId}/telemetry`.
2. The backend validates it (Zod), rejects bad payloads, and stores it with a unique index on `deviceId + recordId`.
3. It sends an acknowledgement on `coldchain/{deviceId}/ack`. The device deletes a record from its SD queue only after that ack.
4. The alert engine evaluates the sample and opens, updates, or resolves alerts.
5. Socket.IO pushes telemetry and alert events to the dashboard.
6. A watchdog marks silent devices stale or offline.

## Collections
`devices`, `telemetries`, `shipments`, `alerts`, `settings`.

## Key rules
- Receive time is server-generated. The device's original timestamp is preserved.
- If a device clock is invalid (`timeValid: false`), receive time is used and the flag is kept.
- Impossible sensor values become `null` and mark the sensor as `error`. Nothing is substituted.
- Coordinates are kept only with a valid fix. 0,0 is never stored.
- Simulated records are flagged `isSimulated` and shown with a DEMO label.
- Alerts are acknowledged, never deleted.