import { z } from 'zod';
import { DATA_SOURCES, SENSOR_STATUSES } from '../config/constants.js';

const numeric = (min, max) => z.number().finite().min(min).max(max).nullable().default(null);

const sensorStatus = z.enum(SENSOR_STATUSES).default('unknown');

export const deviceIdSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,40}$/, 'Invalid deviceId');

export const telemetrySchema = z
  .object({
    schemaVersion: z.literal(1),
    deviceId: deviceIdSchema,
    recordId: z.string().trim().min(1).max(100),
    timestamp: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    timeValid: z.boolean().default(true),
    temperatureC: numeric(-55, 125),
    humidityPct: numeric(0, 100),
    ambientTemperatureC: numeric(-55, 125),
    latitude: numeric(-90, 90),
    longitude: numeric(-180, 180),
    locationSource: z.enum(['gps', 'manual']).default('gps'),
    gpsFix: z.boolean().default(false),
    gpsSatellites: z.number().int().min(0).max(60).default(0),
    speedKmph: numeric(0, 500),
    batteryVoltage: numeric(0, 6),
    batteryPct: numeric(0, 100),
    lidOpen: z.boolean().nullable().default(null),
    motionDetected: z.boolean().nullable().default(null),
    shockDetected: z.boolean().nullable().default(null),
    accel: z
      .object({
        x: numeric(-50, 50),
        y: numeric(-50, 50),
        z: numeric(-50, 50)
      })
      .nullable()
      .default(null),
    sensors: z.object({
      ds18b20: sensorStatus,
      dht22: sensorStatus,
      mpu6050: sensorStatus,
      gps: sensorStatus
    }),
    network: z
      .object({
        wifiConnected: z.boolean().default(false),
        mqttConnected: z.boolean().default(false)
      })
      .default({ wifiConnected: false, mqttConnected: false }),
    queuedRecords: z.number().int().min(0).default(0),
    dataSource: z.enum(DATA_SOURCES).default('live'),
    isSimulated: z.boolean().default(false),
    firmwareVersion: z.string().max(40).optional()
  })
  .refine((data) => (data.latitude === null) === (data.longitude === null), {
    message: 'latitude and longitude must both be set or both be null',
    path: ['latitude']
  });

export const statusSchema = z.object({
  deviceId: deviceIdSchema,
  online: z.boolean(),
  timestamp: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .optional(),
  firmwareVersion: z.string().max(40).optional(),
  hardwareVersion: z.string().max(40).optional(),
  queuedRecords: z.number().int().min(0).optional(),
  isSimulated: z.boolean().optional()
});