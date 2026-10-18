import mongoose from 'mongoose';
import { DATA_SOURCES, SENSOR_STATUSES } from '../config/constants.js';

const sensorField = { type: String, enum: SENSOR_STATUSES, default: 'unknown' };

const telemetrySchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, trim: true },
    shipmentId: { type: String, default: null },
    recordId: { type: String, required: true },
    timestamp: { type: Date, required: true },
    receivedAt: { type: Date, required: true, default: Date.now },
    timeValid: { type: Boolean, default: true },
    temperatureC: { type: Number, default: null },
    humidityPct: { type: Number, default: null },
    ambientTemperatureC: { type: Number, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    gpsFix: { type: Boolean, default: false },
    gpsSatellites: { type: Number, default: 0 },
    speedKmph: { type: Number, default: null },
    batteryVoltage: { type: Number, default: null },
    batteryPct: { type: Number, default: null },
    lidOpen: { type: Boolean, default: null },
    motionDetected: { type: Boolean, default: null },
    shockDetected: { type: Boolean, default: null },
    accel: {
      type: new mongoose.Schema(
        {
          x: { type: Number, default: null },
          y: { type: Number, default: null },
          z: { type: Number, default: null }
        },
        { _id: false }
      ),
      default: null
    },
    sensors: {
      ds18b20: sensorField,
      dht22: sensorField,
      mpu6050: sensorField,
      gps: sensorField
    },
    network: {
      wifiConnected: { type: Boolean, default: false },
      mqttConnected: { type: Boolean, default: false }
    },
    queuedRecords: { type: Number, default: 0, min: 0 },
    dataSource: { type: String, enum: DATA_SOURCES, default: 'live' },
    isSimulated: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

telemetrySchema.index({ deviceId: 1, recordId: 1 }, { unique: true });
telemetrySchema.index({ deviceId: 1, timestamp: -1 });
telemetrySchema.index({ shipmentId: 1, timestamp: -1 });
telemetrySchema.index({ dataSource: 1, timestamp: -1 });
telemetrySchema.index({ isSimulated: 1, timestamp: -1 });

export const Telemetry = mongoose.model('Telemetry', telemetrySchema);