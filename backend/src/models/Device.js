import mongoose from 'mongoose';
import { CONNECTION_STATUSES, SENSOR_STATUSES } from '../config/constants.js';

const sensorField = { type: String, enum: SENSOR_STATUSES, default: 'unknown' };

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true, default: '' },
    hardwareVersion: { type: String, default: '' },
    firmwareVersion: { type: String, default: '' },
    connectionStatus: { type: String, enum: CONNECTION_STATUSES, default: 'unknown', index: true },
    lastSeenAt: { type: Date, default: null },
    lastTelemetryAt: { type: Date, default: null },
    lastRecordTimestamp: { type: Date, default: null },
    sensorHealth: {
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
    lastLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      timestamp: { type: Date, default: null }
    },
    currentShipmentId: { type: String, default: null, index: true },
    isSimulated: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Device = mongoose.model('Device', deviceSchema);