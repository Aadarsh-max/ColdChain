# MQTT topics and payloads

Prefix `coldchain`. QoS 1 for everything.

| Topic | Direction | Purpose |
|---|---|---|
| `coldchain/{deviceId}/telemetry` | device to backend | readings and events |
| `coldchain/{deviceId}/status` | device to backend | online or offline, versions, queue size |
| `coldchain/{deviceId}/events` | device to backend | free-form device events |
| `coldchain/{deviceId}/ack` | backend to device | record acknowledgement |
| `coldchain/{deviceId}/config` | backend to device | retained configuration |
| `coldchain/{deviceId}/commands` | backend to device | reserved for commands |

## Telemetry
```json
{
  "schemaVersion": 1,
  "deviceId": "CC-001",
  "recordId": "unique-per-record",
  "timestamp": "2026-10-18T10:00:00.000Z",
  "timeValid": true,
  "temperatureC": 5.2,
  "humidityPct": 61,
  "ambientTemperatureC": 24.5,
  "latitude": null,
  "longitude": null,
  "gpsFix": false,
  "gpsSatellites": 0,
  "speedKmph": null,
  "batteryVoltage": 3.85,
  "batteryPct": 65,
  "lidOpen": false,
  "motionDetected": false,
  "shockDetected": false,
  "accel": { "x": 0.0, "y": 0.0, "z": 1.0 },
  "sensors": { "ds18b20": "ok", "dht22": "ok", "mpu6050": "ok", "gps": "no_fix" },
  "network": { "wifiConnected": true, "mqttConnected": true },
  "queuedRecords": 0,
  "dataSource": "live",
  "isSimulated": false,
  "firmwareVersion": "1.0.0"
}
```
Values are examples. Real devices send measurements, with `null` for anything unavailable. `dataSource` is `live` or
`synchronized`. Sensor status is one of `ok`, `error`, `stale`, `no_fix`, `not_found`, `disabled`, `unknown`.

## Ack (backend to device)
```json
{ "recordId": "unique-per-record", "status": "stored", "ackedAt": "2026-10-18T10:00:01.000Z" }
```
`status` is `stored`, `duplicate`, or `rejected` (with `reason`). Stored and duplicate mean the device may delete the
record. No ack means the backend or database failed, so the device must keep the record and retry.

## Status
```json
{ "deviceId": "CC-001", "online": true, "timestamp": "ISO", "firmwareVersion": "1.0.0", "hardwareVersion": "ESP32-WROOM-32", "queuedRecords": 0 }
```
Use a Last Will message with `online: false` so the backend learns about unexpected disconnects.

## Config (retained, backend to device)
```json
{ "sampleIntervalSeconds": 5, "shockThresholdG": 2.5, "lowBatteryPct": 20, "criticalBatteryPct": 10, "buzzerEnabled": true, "updatedAt": "ISO" }
```