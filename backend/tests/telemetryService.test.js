import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/models/Telemetry.js', () => ({ Telemetry: { create: vi.fn() } }));
vi.mock('../src/services/deviceService.js', () => ({
  getActiveShipment: vi.fn(async () => null),
  updateDeviceFromTelemetry: vi.fn(async () => null)
}));
vi.mock('../src/services/settingsService.js', () => ({ getSettings: vi.fn(async () => ({})) }));
vi.mock('../src/services/alertEngine.js', () => ({
  processSample: vi.fn(async () => 0),
  resolveConnectivityAlerts: vi.fn(async () => 0),
  connectivityFlagged: new Set()
}));

import { Telemetry } from '../src/models/Telemetry.js';
import { processSample } from '../src/services/alertEngine.js';
import { ingestTelemetry, validateIncoming } from '../src/services/telemetryService.js';
import { runExclusive } from '../src/utils/keyedQueue.js';
import { makePayload } from './helpers.js';

const NOW = new Date('2026-10-18T10:00:00Z');

const check = (overrides = {}, topicDeviceId = 'CC-001') =>
  validateIncoming({
    payload: makePayload({ timestamp: NOW.toISOString(), ...overrides }),
    topicDeviceId,
    now: NOW
  });

describe('validateIncoming', () => {
  it('accepts a valid payload', () => {
    expect(check().ok).toBe(true);
  });

  it('rejects non-object payloads', () => {
    expect(validateIncoming({ payload: null, topicDeviceId: 'CC-001', now: NOW }).reason).toBe('invalid_payload');
    expect(validateIncoming({ payload: [1, 2], topicDeviceId: 'CC-001', now: NOW }).reason).toBe('invalid_payload');
  });

  it('rejects a missing record id', () => {
    const payload = makePayload({ timestamp: NOW.toISOString() });
    delete payload.recordId;
    expect(validateIncoming({ payload, topicDeviceId: 'CC-001', now: NOW }).reason).toBe('invalid_payload');
  });

  it('rejects a device id that differs from the topic', () => {
    expect(check({}, 'CC-002').reason).toBe('device_mismatch');
  });

  it('rejects timestamps too far in the future', () => {
    const future = new Date(NOW.getTime() + 3600 * 1000).toISOString();
    expect(check({ timestamp: future }).reason).toBe('timestamp_in_future');
  });

  it('rejects timestamps older than the allowed age', () => {
    const old = new Date(NOW.getTime() - 31 * 86400000).toISOString();
    expect(check({ timestamp: old }).reason).toBe('timestamp_too_old');
  });

  it('accepts old timestamps within the allowed age as offline records', () => {
    const recent = new Date(NOW.getTime() - 2 * 86400000).toISOString();
    expect(check({ timestamp: recent, dataSource: 'synchronized' }).ok).toBe(true);
  });

  it('skips age checks when the device clock is not valid', () => {
    expect(check({ timestamp: '1970-01-01T00:00:00Z', timeValid: false }).ok).toBe(true);
  });

  it('turns an impossible temperature into null and flags the sensor', () => {
    const result = check({ temperatureC: -127 });
    expect(result.ok).toBe(true);
    expect(result.data.temperatureC).toBeNull();
    expect(result.data.sensors.ds18b20).toBe('error');
    expect(result.warnings).toContain('temperatureC_out_of_range');
  });

  it('turns an impossible humidity into null and flags the DHT22', () => {
    const result = check({ humidityPct: 180 });
    expect(result.data.humidityPct).toBeNull();
    expect(result.data.sensors.dht22).toBe('error');
  });

  it('marks a sensor as error when it claims ok but sends no value', () => {
    const result = check({ temperatureC: null });
    expect(result.data.sensors.ds18b20).toBe('error');
  });

  it('drops coordinates when there is no fix', () => {
    const result = check({ latitude: 19.07, longitude: 72.87, gpsFix: false });
    expect(result.data.latitude).toBeNull();
    expect(result.data.longitude).toBeNull();
  });

  it('never keeps 0,0 as a location', () => {
    const result = check({ latitude: 0, longitude: 0, gpsFix: true });
    expect(result.data.latitude).toBeNull();
    expect(result.data.gpsFix).toBe(false);
    expect(result.warnings).toContain('invalid_coordinates');
  });

  it('keeps valid coordinates with a fix', () => {
    const result = check({ latitude: 19.076, longitude: 72.8777, gpsFix: true, gpsSatellites: 7 });
    expect(result.data.latitude).toBe(19.076);
    expect(result.data.gpsFix).toBe(true);
  });
});

describe('ingestTelemetry', () => {
  beforeEach(() => {
    Telemetry.create.mockReset();
    processSample.mockClear();
    Telemetry.create.mockImplementation(async (doc) => ({ toObject: () => ({ ...doc }) }));
  });

  it('stores a valid record and runs the alert engine', async () => {
    const result = await ingestTelemetry({ payload: makePayload({ recordId: 'a1' }), topicDeviceId: 'CC-001' });
    expect(result.status).toBe('stored');
    expect(result.recordId).toBe('a1');
    expect(Telemetry.create).toHaveBeenCalledTimes(1);
    expect(processSample).toHaveBeenCalledTimes(1);
  });

  it('reports duplicates without running the alert engine', async () => {
    Telemetry.create.mockRejectedValueOnce({ code: 11000 });
    const result = await ingestTelemetry({ payload: makePayload({ recordId: 'dup' }), topicDeviceId: 'CC-001' });
    expect(result.status).toBe('duplicate');
    expect(result.recordId).toBe('dup');
    expect(processSample).not.toHaveBeenCalled();
  });

  it('rejects invalid payloads and returns the record id when available', async () => {
    const result = await ingestTelemetry({
      payload: makePayload({ recordId: 'bad', humidityPct: 'wet' }),
      topicDeviceId: 'CC-001'
    });
    expect(result.status).toBe('rejected');
    expect(result.recordId).toBe('bad');
    expect(Telemetry.create).not.toHaveBeenCalled();
  });

  it('still stores the record when alert processing fails', async () => {
    processSample.mockRejectedValueOnce(new Error('boom'));
    const result = await ingestTelemetry({ payload: makePayload({ recordId: 'ok1' }), topicDeviceId: 'CC-001' });
    expect(result.status).toBe('stored');
  });

  it('throws on database errors so that no ack is sent', async () => {
    Telemetry.create.mockRejectedValueOnce(new Error('database down'));
    await expect(
      ingestTelemetry({ payload: makePayload({ recordId: 'db1' }), topicDeviceId: 'CC-001' })
    ).rejects.toThrow('database down');
  });

  it('substitutes receive time when the device clock is invalid', async () => {
    const receivedAt = new Date('2026-10-18T12:00:00Z');
    await ingestTelemetry({
      payload: makePayload({ recordId: 'nt1', timestamp: '1970-01-01T00:00:00Z', timeValid: false }),
      topicDeviceId: 'CC-001',
      now: receivedAt
    });
    const saved = Telemetry.create.mock.calls[0][0];
    expect(saved.timestamp.getTime()).toBe(receivedAt.getTime());
    expect(saved.timeValid).toBe(false);
  });
});

describe('runExclusive', () => {
  it('runs tasks for the same key in order', async () => {
    const order = [];
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await Promise.all([
      runExclusive('k', async () => {
        await sleep(20);
        order.push(1);
      }),
      runExclusive('k', async () => {
        order.push(2);
      })
    ]);
    expect(order).toEqual([1, 2]);
  });

  it('continues after a failed task', async () => {
    await expect(runExclusive('k2', async () => { throw new Error('x'); })).rejects.toThrow('x');
    await expect(runExclusive('k2', async () => 'fine')).resolves.toBe('fine');
  });
});