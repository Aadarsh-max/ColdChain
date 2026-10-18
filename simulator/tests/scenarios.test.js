import { describe, it, expect } from 'vitest';
import { scenarios } from '../src/scenarios.js';
import { VirtualDevice } from '../src/device.js';

const AT = Date.parse('2026-10-18T10:00:00Z');

const simulate = (name) => {
  const scenario = scenarios[name];
  const device = new VirtualDevice({ deviceId: 'SIM-001', seed: 7 });
  const records = [];
  for (let i = 0; i < scenario.ticks; i += 1) {
    records.push(device.step(scenario.control(i, scenario.ticks), AT + i * 5000));
  }
  return records;
};

const magnitude = (accel) => Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);

describe('scenario definitions', () => {
  it('every scenario has a description and either control or run', () => {
    for (const [name, scenario] of Object.entries(scenarios)) {
      expect(scenario.description, name).toBeTruthy();
      expect(typeof scenario.control === 'function' || typeof scenario.run === 'function', name).toBe(true);
    }
  });

  it('every tick based scenario returns an object for every tick', () => {
    for (const [name, scenario] of Object.entries(scenarios)) {
      if (!scenario.control) continue;
      for (let i = 0; i < scenario.ticks; i += 1) {
        expect(typeof scenario.control(i, scenario.ticks), name).toBe('object');
      }
    }
  });
});

describe('scenario behaviour', () => {
  it('normal stays inside 2 to 8 C', () => {
    for (const record of simulate('normal')) {
      expect(record.temperatureC).toBeGreaterThan(2);
      expect(record.temperatureC).toBeLessThan(8);
    }
  });

  it('high-excursion rises above 10 C, stays above 8 for several records, and recovers', () => {
    const temps = simulate('high-excursion').map((r) => r.temperatureC);
    expect(Math.max(...temps)).toBeGreaterThan(10);
    expect(temps.filter((t) => t > 8).length).toBeGreaterThan(10);
    expect(temps[temps.length - 1]).toBeLessThan(7.5);
  });

  it('low-excursion drops below 0 C and recovers', () => {
    const temps = simulate('low-excursion').map((r) => r.temperatureC);
    expect(Math.min(...temps)).toBeLessThan(0);
    expect(temps[temps.length - 1]).toBeGreaterThan(3);
  });

  it('lid-open opens and closes the lid', () => {
    const records = simulate('lid-open');
    expect(records[0].lidOpen).toBe(false);
    expect(records[10].lidOpen).toBe(true);
    expect(records[records.length - 1].lidOpen).toBe(false);
  });

  it('shock creates flagged and accelerometer-only events', () => {
    const records = simulate('shock');
    expect(records[6].shockDetected).toBe(true);
    expect(records[18].shockDetected).toBe(false);
    expect(magnitude(records[18].accel)).toBeGreaterThan(3);
    expect(magnitude(records[24].accel)).toBeGreaterThan(5);
  });

  it('gps-fix and gps-no-fix are consistent', () => {
    expect(simulate('gps-fix').every((r) => r.gpsFix && r.latitude !== null)).toBe(true);
    expect(simulate('gps-no-fix').every((r) => !r.gpsFix && r.latitude === null)).toBe(true);
  });

  it('gps-loss loses and regains the fix', () => {
    const records = simulate('gps-loss');
    expect(records[0].gpsFix).toBe(true);
    expect(records[20].gpsFix).toBe(false);
    expect(records[45].gpsFix).toBe(true);
  });

  it('low-battery drains below the critical level', () => {
    const records = simulate('low-battery');
    expect(records[0].batteryPct).toBe(28);
    expect(records.some((r) => r.batteryPct <= 10)).toBe(true);
  });

  it('invalid-sensor produces every kind of bad data', () => {
    const records = simulate('invalid-sensor');
    expect(records.some((r) => r.temperatureC === null && r.sensors.ds18b20 === 'error')).toBe(true);
    expect(records.some((r) => r.temperatureC === -127)).toBe(true);
    expect(records.some((r) => r.humidityPct === 180)).toBe(true);
    expect(records.some((r) => r.accel === null)).toBe(true);
  });

  it('duplicates marks every record for double publishing', () => {
    const scenario = scenarios.duplicates;
    for (let i = 0; i < scenario.ticks; i += 1) {
      expect(scenario.control(i).duplicate).toBe(true);
    }
  });

  it('demo covers an excursion, lid, shock, gps loss, and a draining battery', () => {
    const records = simulate('demo');
    expect(Math.max(...records.map((r) => r.temperatureC))).toBeGreaterThan(10);
    expect(records.some((r) => r.lidOpen)).toBe(true);
    expect(records[62].shockDetected).toBe(true);
    expect(records[75].gpsFix).toBe(false);
    expect(records[records.length - 1].batteryPct).toBeLessThan(10);
  });
});