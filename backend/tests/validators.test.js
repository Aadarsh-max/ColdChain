import { describe, it, expect } from 'vitest';
import { deviceIdSchema, statusSchema, telemetrySchema } from '../src/validators/telemetry.schema.js';
import { createShipmentSchema, updateShipmentSchema } from '../src/validators/shipment.schema.js';
import {
  alertsQuerySchema,
  paginationSchema,
  readingsQuerySchema
} from '../src/validators/query.schema.js';
import { makePayload } from './helpers.js';

const shipment = (overrides = {}) => ({
  shipmentId: 'CC1024',
  productName: 'Vaccines',
  minTempC: 2,
  maxTempC: 8,
  origin: { name: 'Mumbai' },
  destination: { name: 'Pune' },
  ...overrides
});

describe('telemetry schema', () => {
  it('accepts a valid payload and converts the timestamp to a Date', () => {
    const result = telemetrySchema.safeParse(makePayload());
    expect(result.success).toBe(true);
    expect(result.data.timestamp).toBeInstanceOf(Date);
  });

  it('applies defaults for optional fields', () => {
    const payload = makePayload();
    delete payload.dataSource;
    delete payload.queuedRecords;
    const result = telemetrySchema.parse(payload);
    expect(result.dataSource).toBe('live');
    expect(result.queuedRecords).toBe(0);
  });

  it('rejects a wrong schema version', () => {
    expect(telemetrySchema.safeParse(makePayload({ schemaVersion: 2 })).success).toBe(false);
  });

  it('rejects an invalid device id', () => {
    expect(telemetrySchema.safeParse(makePayload({ deviceId: 'CC/001' })).success).toBe(false);
  });

  it('rejects latitude without longitude', () => {
    expect(telemetrySchema.safeParse(makePayload({ latitude: 19.07, longitude: null })).success).toBe(false);
  });

  it('rejects out of range humidity', () => {
    expect(telemetrySchema.safeParse(makePayload({ humidityPct: 120 })).success).toBe(false);
  });

  it('rejects a non-ISO timestamp', () => {
    expect(telemetrySchema.safeParse(makePayload({ timestamp: 'yesterday' })).success).toBe(false);
  });

  it('rejects an unknown sensor status', () => {
    const payload = makePayload({ sensors: { ds18b20: 'great', dht22: 'ok', mpu6050: 'ok', gps: 'ok' } });
    expect(telemetrySchema.safeParse(payload).success).toBe(false);
  });

  it('accepts null measurements when sensors report errors', () => {
    const payload = makePayload({
      temperatureC: null,
      humidityPct: null,
      sensors: { ds18b20: 'error', dht22: 'error', mpu6050: 'ok', gps: 'no_fix' }
    });
    expect(telemetrySchema.safeParse(payload).success).toBe(true);
  });
});

describe('device id and status schemas', () => {
  it('accepts simple ids and rejects unsafe ones', () => {
    expect(deviceIdSchema.safeParse('CC-001').success).toBe(true);
    expect(deviceIdSchema.safeParse('a b').success).toBe(false);
    expect(deviceIdSchema.safeParse('').success).toBe(false);
  });

  it('validates status payloads', () => {
    expect(statusSchema.safeParse({ deviceId: 'CC-001', online: true }).success).toBe(true);
    expect(statusSchema.safeParse({ deviceId: 'CC-001' }).success).toBe(false);
  });
});

describe('shipment schemas', () => {
  it('accepts a valid shipment', () => {
    expect(createShipmentSchema.safeParse(shipment()).success).toBe(true);
  });

  it('rejects min temperature greater than or equal to max', () => {
    expect(createShipmentSchema.safeParse(shipment({ minTempC: 8, maxTempC: 8 })).success).toBe(false);
  });

  it('rejects arrival before start', () => {
    const result = createShipmentSchema.safeParse(
      shipment({ startTime: '2026-10-18T10:00:00Z', expectedArrival: '2026-10-18T09:00:00Z' })
    );
    expect(result.success).toBe(false);
  });

  it('rejects an invalid shipment id', () => {
    expect(createShipmentSchema.safeParse(shipment({ shipmentId: 'a' })).success).toBe(false);
  });

  it('allows partial updates but not empty ones', () => {
    expect(updateShipmentSchema.safeParse({ status: 'delivered' }).success).toBe(true);
    expect(updateShipmentSchema.safeParse({}).success).toBe(false);
  });
});

describe('query schemas', () => {
  it('applies pagination defaults', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 50 });
  });

  it('rejects limits above 500', () => {
    expect(paginationSchema.safeParse({ limit: 1000 }).success).toBe(false);
  });

  it('rejects from after to', () => {
    const result = readingsQuerySchema.safeParse({ from: '2026-10-18', to: '2026-10-01' });
    expect(result.success).toBe(false);
  });

  it('parses boolean strings', () => {
    expect(readingsQuerySchema.parse({ isSimulated: 'true' }).isSimulated).toBe(true);
  });

  it('merges alert filters', () => {
    const result = alertsQuerySchema.parse({ type: 'lid_opened', deviceId: 'CC-001' });
    expect(result.type).toBe('lid_opened');
    expect(result.deviceId).toBe('CC-001');
    expect(result.page).toBe(1);
  });

  it('rejects an unknown alert type', () => {
    expect(alertsQuerySchema.safeParse({ type: 'nonsense' }).success).toBe(false);
  });
});