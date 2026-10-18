import { describe, it, expect } from 'vitest';
import { VirtualDevice, pctToVoltage, routePoint } from '../src/device.js';

const AT = Date.parse('2026-10-18T10:00:00Z');
const make = (overrides = {}) => new VirtualDevice({ deviceId: 'SIM-001', seed: 42, ...overrides });

describe('virtual device records', () => {
  it('produces a complete synthetic record with no GPS by default', () => {
    const record = make().step({}, AT);
    expect(record.schemaVersion).toBe(1);
    expect(record.isSimulated).toBe(true);
    expect(record.gpsFix).toBe(false);
    expect(record.latitude).toBeNull();
    expect(record.longitude).toBeNull();
    expect(record.sensors.gps).toBe('no_fix');
    expect(record.timestamp).toBe(new Date(AT).toISOString());
    expect(record.dataSource).toBe('live');
  });

  it('is repeatable with the same seed', () => {
    const a = make();
    const b = make();
    const seriesA = Array.from({ length: 10 }, () => a.step({ targetTemp: 9 }, AT).temperatureC);
    const seriesB = Array.from({ length: 10 }, () => b.step({ targetTemp: 9 }, AT).temperatureC);
    expect(seriesA).toEqual(seriesB);
  });

  it('creates unique, well formed record ids', () => {
    const device = make();
    const ids = new Set(Array.from({ length: 100 }, () => device.step({}, AT).recordId));
    expect(ids.size).toBe(100);
    expect([...ids][0]).toMatch(/^SIM-001-[a-z0-9]+-\d{6}$/);
  });

  it('moves temperature toward the target', () => {
    const device = make();
    let last = null;
    for (let i = 0; i < 30; i += 1) last = device.step({ targetTemp: 11 }, AT).temperatureC;
    expect(last).toBeGreaterThan(10);
  });

  it('reports a GPS fix inside the Mumbai to Pune corridor', () => {
    const record = make().step({ gps: true }, AT);
    expect(record.gpsFix).toBe(true);
    expect(record.latitude).toBeGreaterThan(18.4);
    expect(record.latitude).toBeLessThan(19.2);
    expect(record.longitude).toBeGreaterThan(72.8);
    expect(record.longitude).toBeLessThan(74);
    expect(record.gpsSatellites).toBeGreaterThanOrEqual(6);
  });

  it('nulls the temperature when the DS18B20 fails', () => {
    const record = make().step({ sensors: { ds18b20: 'error' } }, AT);
    expect(record.temperatureC).toBeNull();
    expect(record.sensors.ds18b20).toBe('error');
    expect(record.humidityPct).not.toBeNull();
  });

  it('nulls humidity and ambient temperature when the DHT22 fails', () => {
    const record = make().step({ sensors: { dht22: 'error' } }, AT);
    expect(record.humidityPct).toBeNull();
    expect(record.ambientTemperatureC).toBeNull();
  });

  it('nulls motion data when the MPU6050 fails', () => {
    const record = make().step({ sensors: { mpu6050: 'error' } }, AT);
    expect(record.accel).toBeNull();
    expect(record.shockDetected).toBeNull();
    expect(record.motionDetected).toBeNull();
  });

  it('applies raw overrides last', () => {
    expect(make().step({ raw: { temperatureC: -127 } }, AT).temperatureC).toBe(-127);
  });

  it('creates a shock with a large acceleration magnitude', () => {
    const record = make().step({ shock: true }, AT);
    const { x, y, z } = record.accel;
    expect(record.shockDetected).toBe(true);
    expect(record.motionDetected).toBe(true);
    expect(Math.sqrt(x * x + y * y + z * z)).toBeGreaterThan(2.5);
  });

  it('reports the lid state', () => {
    expect(make().step({ lidOpen: true }, AT).lidOpen).toBe(true);
    expect(make().step({}, AT).lidOpen).toBe(false);
  });

  it('applies a battery override with a matching voltage', () => {
    const record = make().step({ battery: 12 }, AT);
    expect(record.batteryPct).toBe(12);
    expect(record.batteryVoltage).toBeGreaterThan(3.4);
    expect(record.batteryVoltage).toBeLessThan(3.5);
  });
});

describe('helpers', () => {
  it('maps battery percentage to a rising voltage', () => {
    expect(pctToVoltage(0)).toBeCloseTo(3.0, 3);
    expect(pctToVoltage(100)).toBeCloseTo(4.2, 3);
    let previous = 0;
    for (let pct = 0; pct <= 100; pct += 5) {
      const voltage = pctToVoltage(pct);
      expect(voltage).toBeGreaterThanOrEqual(previous);
      previous = voltage;
    }
  });

  it('starts the route in Mumbai and ends in Pune', () => {
    expect(routePoint(0).latitude).toBeCloseTo(19.076, 3);
    expect(routePoint(1).latitude).toBeCloseTo(18.5204, 3);
    expect(routePoint(1).longitude).toBeCloseTo(73.8567, 3);
  });
});