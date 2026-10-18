import { describe, it, expect } from 'vitest';
import { accelMagnitude, createDeviceState, evaluateSample } from '../src/services/alertRules.js';

const baseConfig = {
  minTempC: 2,
  maxTempC: 8,
  hysteresisC: 0.3,
  debounceSamples: 3,
  criticalExcursionMinutes: 30,
  lowBatteryPct: 20,
  criticalBatteryPct: 10,
  shockThresholdG: 2.5,
  gpsExpected: true,
  prefs: { lidOpened: true, shock: true, lowBattery: true, sensorFailure: true, gpsUnavailable: false }
};

const T0 = Date.parse('2026-10-18T10:00:00Z');
const at = (sec) => new Date(T0 + sec * 1000);

const sample = (sec, overrides = {}) => ({
  deviceId: 'CC-001',
  recordId: `r-${sec}`,
  timestamp: at(sec),
  temperatureC: 5,
  lidOpen: false,
  shockDetected: false,
  accel: null,
  batteryPct: 80,
  gpsFix: true,
  sensors: { ds18b20: 'ok', dht22: 'ok', mpu6050: 'ok', gps: 'ok' },
  ...overrides
});

const series = (startSec, count, stepSec, overrides) =>
  Array.from({ length: count }, (_, i) => sample(startSec + i * stepSec, overrides));

const run = (samples, config = baseConfig) => {
  const state = createDeviceState();
  const active = {};
  const log = [];

  for (const s of samples) {
    const { actions } = evaluateSample({ sample: s, state, active, config });
    for (const a of actions) {
      if (a.op === 'open' && !a.instant) {
        active[a.type] = {
          _id: a.type,
          type: a.type,
          startedAt: a.startedAt,
          severity: a.severity,
          peakValue: a.peakValue ?? null,
          lowestValue: a.lowestValue ?? null,
          description: a.description
        };
      }
      if (a.op === 'update' && active[a.type]) Object.assign(active[a.type], a.fields);
      if (a.op === 'close') delete active[a.type];
      log.push(a);
    }
  }

  return { log, active, state };
};

const opens = (log, type) => log.filter((a) => a.op === 'open' && a.type === type);
const closes = (log, type) => log.filter((a) => a.op === 'close' && a.type === type);

describe('temperature alerts', () => {
  it('stays quiet for normal temperatures', () => {
    const { log } = run(series(0, 10, 5, { temperatureC: 5 }));
    expect(log).toHaveLength(0);
  });

  it('does not alert on a single spike', () => {
    const temps = [9, 5, 9, 5, 9];
    const { log } = run(temps.map((t, i) => sample(i * 5, { temperatureC: t })));
    expect(opens(log, 'temperature_high')).toHaveLength(0);
  });

  it('opens a high alert after the debounce count and keeps the first violation time', () => {
    const { log } = run(series(0, 3, 5, { temperatureC: 9 }));
    const found = opens(log, 'temperature_high');
    expect(found).toHaveLength(1);
    expect(found[0].startedAt.getTime()).toBe(T0);
    expect(found[0].severity).toBe('warning');
    expect(found[0].thresholdValue).toBe(8);
  });

  it('marks large deviations as critical', () => {
    const { log } = run(series(0, 3, 5, { temperatureC: 10.5 }));
    expect(opens(log, 'temperature_high')[0].severity).toBe('critical');
  });

  it('opens a low alert', () => {
    const { log } = run(series(0, 3, 5, { temperatureC: 1 }));
    const found = opens(log, 'temperature_low');
    expect(found).toHaveLength(1);
    expect(found[0].lowestValue).toBe(1);
  });

  it('tracks the peak temperature', () => {
    const temps = [9, 9, 9, 9.5, 10];
    const { active } = run(temps.map((t, i) => sample(i * 5, { temperatureC: t })));
    expect(active.temperature_high.peakValue).toBe(10);
  });

  it('applies hysteresis before clearing', () => {
    const samples = [
      ...series(0, 3, 5, { temperatureC: 9 }),
      ...series(15, 3, 5, { temperatureC: 7.9 }),
      ...series(30, 3, 5, { temperatureC: 7.5 })
    ];
    const { log, active } = run(samples);
    expect(closes(log, 'temperature_high')).toHaveLength(1);
    expect(closes(log, 'temperature_high')[0].endedAt.getTime()).toBe(T0 + 40000);
    expect(active.temperature_high).toBeUndefined();
  });

  it('does not clear while inside the hysteresis band', () => {
    const samples = [...series(0, 3, 5, { temperatureC: 9 }), ...series(15, 6, 5, { temperatureC: 7.9 })];
    const { active } = run(samples);
    expect(active.temperature_high).toBeDefined();
  });

  it('ignores null temperatures and non-ok sensors', () => {
    const { log } = run(series(0, 5, 5, { temperatureC: null }));
    expect(opens(log, 'temperature_high')).toHaveLength(0);
    expect(opens(log, 'temperature_low')).toHaveLength(0);
  });
});

describe('excursion duration', () => {
  it('opens a critical duration alert after the configured minutes and closes with the excursion', () => {
    const samples = [...series(0, 36, 60, { temperatureC: 9 }), ...series(36 * 60, 3, 60, { temperatureC: 5 })];
    const { log, active } = run(samples);

    const found = opens(log, 'excursion_duration');
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('critical');
    expect(found[0].startedAt.getTime()).toBe(T0 + 1800 * 1000);
    expect(closes(log, 'excursion_duration')).toHaveLength(1);
    expect(active.excursion_duration).toBeUndefined();
    expect(active.temperature_high).toBeUndefined();
  });

  it('does not open before the limit is reached', () => {
    const { log } = run(series(0, 20, 60, { temperatureC: 9 }));
    expect(opens(log, 'excursion_duration')).toHaveLength(0);
  });
});

describe('sensor failure', () => {
  it('opens a critical alert when the product probe fails', () => {
    const { log } = run(
      series(0, 3, 5, {
        temperatureC: null,
        sensors: { ds18b20: 'error', dht22: 'ok', mpu6050: 'ok', gps: 'ok' }
      })
    );
    const found = opens(log, 'sensor_failure');
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('critical');
    expect(found[0].description).toContain('ds18b20');
    expect(opens(log, 'temperature_high')).toHaveLength(0);
  });

  it('uses warning severity for non-critical sensors and clears on recovery', () => {
    const samples = [
      ...series(0, 3, 5, { sensors: { ds18b20: 'ok', dht22: 'error', mpu6050: 'ok', gps: 'ok' } }),
      ...series(15, 3, 5)
    ];
    const { log, active } = run(samples);
    expect(opens(log, 'sensor_failure')[0].severity).toBe('warning');
    expect(active.sensor_failure).toBeUndefined();
  });

  it('does not treat no_fix as a sensor failure', () => {
    const { log } = run(
      series(0, 5, 5, { gpsFix: false, sensors: { ds18b20: 'ok', dht22: 'ok', mpu6050: 'ok', gps: 'no_fix' } })
    );
    expect(opens(log, 'sensor_failure')).toHaveLength(0);
  });
});

describe('lid alerts', () => {
  it('opens immediately and closes when the lid is closed', () => {
    const { log, active } = run([
      sample(0),
      sample(5, { lidOpen: true }),
      sample(10, { lidOpen: true }),
      sample(15, { lidOpen: false })
    ]);
    expect(opens(log, 'lid_opened')).toHaveLength(1);
    expect(closes(log, 'lid_opened')).toHaveLength(1);
    expect(active.lid_opened).toBeUndefined();
  });

  it('escalates to critical after five minutes', () => {
    const { active } = run([sample(0, { lidOpen: true }), sample(310, { lidOpen: true })]);
    expect(active.lid_opened.severity).toBe('critical');
  });

  it('closes an active alert when the preference is turned off', () => {
    const state = createDeviceState();
    const active = { lid_opened: { _id: 'x', startedAt: at(0), severity: 'warning' } };
    const config = { ...baseConfig, prefs: { ...baseConfig.prefs, lidOpened: false } };
    const { actions } = evaluateSample({ sample: sample(10, { lidOpen: true }), state, active, config });
    expect(actions.filter((a) => a.op === 'close' && a.type === 'lid_opened')).toHaveLength(1);
  });
});

describe('shock alerts', () => {
  it('creates an instant event from the device flag', () => {
    const { log } = run([sample(0, { shockDetected: true })]);
    const found = opens(log, 'shock_detected');
    expect(found).toHaveLength(1);
    expect(found[0].instant).toBe(true);
  });

  it('derives a shock from acceleration magnitude', () => {
    const { log } = run([sample(0, { accel: { x: 2, y: 2, z: 2 } })]);
    const found = opens(log, 'shock_detected');
    expect(found).toHaveLength(1);
    expect(found[0].peakValue).toBeCloseTo(3.46, 2);
  });

  it('applies a cooldown between shock events', () => {
    const { log } = run([
      sample(0, { shockDetected: true }),
      sample(10, { shockDetected: true }),
      sample(31, { shockDetected: true })
    ]);
    expect(opens(log, 'shock_detected')).toHaveLength(2);
  });

  it('ignores normal gravity readings', () => {
    const { log } = run([sample(0, { accel: { x: 0, y: 0, z: 1 } })]);
    expect(opens(log, 'shock_detected')).toHaveLength(0);
  });
});

describe('battery alerts', () => {
  it('opens a warning, escalates to critical, and clears with margin', () => {
    const samples = [
      ...series(0, 3, 5, { batteryPct: 15 }),
      sample(15, { batteryPct: 8 }),
      ...series(20, 3, 5, { batteryPct: 30 })
    ];
    const { log, active } = run(samples);
    expect(opens(log, 'low_battery')[0].severity).toBe('warning');
    expect(closes(log, 'low_battery')).toHaveLength(1);
    expect(active.low_battery).toBeUndefined();
  });

  it('escalates severity when the battery gets critical', () => {
    const { active } = run([...series(0, 3, 5, { batteryPct: 15 }), sample(15, { batteryPct: 8 })]);
    expect(active.low_battery.severity).toBe('critical');
    expect(active.low_battery.lowestValue).toBe(8);
  });

  it('does not clear inside the recovery margin', () => {
    const { active } = run([...series(0, 3, 5, { batteryPct: 15 }), ...series(15, 6, 5, { batteryPct: 22 })]);
    expect(active.low_battery).toBeDefined();
  });
});

describe('gps alerts', () => {
  const gpsConfig = { ...baseConfig, prefs: { ...baseConfig.prefs, gpsUnavailable: true } };

  it('is disabled by default', () => {
    const { log } = run(series(0, 20, 5, { gpsFix: false }));
    expect(opens(log, 'gps_unavailable')).toHaveLength(0);
  });

  it('does not open before the raise count', () => {
    const { log } = run(series(0, 11, 5, { gpsFix: false }), gpsConfig);
    expect(opens(log, 'gps_unavailable')).toHaveLength(0);
  });

  it('opens after sustained no-fix and clears when a fix returns', () => {
    const samples = [...series(0, 12, 5, { gpsFix: false }), ...series(60, 3, 5, { gpsFix: true })];
    const { log, active } = run(samples, gpsConfig);
    expect(opens(log, 'gps_unavailable')[0].severity).toBe('info');
    expect(active.gps_unavailable).toBeUndefined();
  });
});

describe('ordering and helpers', () => {
  it('skips samples older than the last processed one', () => {
    const state = createDeviceState();
    const first = evaluateSample({ sample: sample(100, { temperatureC: 9 }), state, active: {}, config: baseConfig });
    const second = evaluateSample({ sample: sample(50, { temperatureC: 9 }), state, active: {}, config: baseConfig });
    expect(first.skipped).toBe(false);
    expect(second.skipped).toBe(true);
    expect(second.actions).toHaveLength(0);
    expect(state.lastTs).toBe(T0 + 100000);
  });

  it('computes acceleration magnitude safely', () => {
    expect(accelMagnitude({ x: 3, y: 4, z: 0 })).toBe(5);
    expect(accelMagnitude(null)).toBeNull();
    expect(accelMagnitude({ x: 1, y: null, z: 1 })).toBeNull();
  });
});