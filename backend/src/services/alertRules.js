export const CRITICAL_DEVIATION_C = 2;
export const GPS_RAISE_SAMPLES = 12;
export const GPS_CLEAR_SAMPLES = 3;
export const SHOCK_COOLDOWN_MS = 30000;
export const BATTERY_CLEAR_MARGIN_PCT = 5;
export const LID_CRITICAL_SECONDS = 300;
export const SENSOR_KEYS = ['ds18b20', 'dht22', 'mpu6050', 'gps'];

const FAILING_STATUSES = new Set(['error', 'not_found', 'stale']);

const PREF_BY_TYPE = {
  lid_opened: 'lidOpened',
  shock_detected: 'shock',
  low_battery: 'lowBattery',
  sensor_failure: 'sensorFailure',
  gps_unavailable: 'gpsUnavailable'
};

const HIGH_CAUSES = [
  'Gel packs may have warmed up or lost capacity',
  'Lid may have been open or not fully sealed',
  'High ambient temperature around the box',
  'Sensor placement or a sensor fault (not confirmed)'
];

const LOW_CAUSES = [
  'Gel packs may be too cold or touching the probe',
  'Very low ambient temperature',
  'Sensor placement or a sensor fault (not confirmed)'
];

const LID_CAUSES = [
  'Container opened for access, loading, or inspection',
  'Reed switch or magnet misalignment could also report this'
];

const SHOCK_CAUSES = [
  'Drop, bump, or rough handling',
  'Vehicle vibration or sudden braking',
  'Sensor noise or loose mounting (not confirmed)'
];

const BATTERY_CAUSES = [
  'Battery is discharging with no external power',
  'Percentage is estimated from voltage and may be inaccurate under load or cold'
];

const GPS_CAUSES = [
  'Device may be indoors or inside a vehicle without sky view',
  'Antenna may be blocked or still acquiring a first fix',
  'GPS module wiring or fault (not confirmed)'
];

const SENSOR_CAUSES = [
  'Loose wiring or a poor connection',
  'Sensor or module fault',
  'Power supply instability'
];

const EXCURSION_CAUSES = [
  'Cooling capacity may be exhausted',
  'Prolonged exposure to ambient temperature (not confirmed)'
];

const round2 = (value) => Math.round(value * 100) / 100;
const wholeMinutes = (ms) => Math.floor(ms / 60000);

export const createDeviceState = () => ({ counters: {}, lastShockAt: 0, lastTs: 0 });

export const accelMagnitude = (accel) => {
  if (!accel) return null;
  const { x, y, z } = accel;
  if ([x, y, z].some((v) => typeof v !== 'number' || !Number.isFinite(v))) return null;
  return Math.sqrt(x * x + y * y + z * z);
};

const step = (state, key, violating, isActive, raiseAfter, clearAfter, ts) => {
  const counter = state.counters[key] || { on: 0, off: 0, since: null };
  if (violating) {
    if (counter.on === 0) counter.since = ts;
    counter.on += 1;
    counter.off = 0;
  } else {
    counter.off += 1;
    counter.on = 0;
    counter.since = null;
  }
  state.counters[key] = counter;
  if (!isActive && counter.on >= raiseAfter) return { action: 'raise', since: counter.since };
  if (isActive && counter.off >= clearAfter) return { action: 'clear', since: null };
  return { action: 'none', since: counter.since };
};

export const evaluateSample = ({ sample, state, active, config }) => {
  const ts = sample.timestamp.getTime();
  if (ts < state.lastTs) return { state, actions: [], skipped: true };
  state.lastTs = ts;

  const actions = [];
  const closing = new Set();
  const prefs = config.prefs || {};
  const n = config.debounceSamples;
  const at = sample.timestamp;
  const recordId = sample.recordId;

  const enabled = (type) => prefs[PREF_BY_TYPE[type]] !== false;
  const elapsedSeconds = (type) =>
    Math.max(0, Math.round((ts - new Date(active[type].startedAt).getTime()) / 1000));

  const open = (type, fields) => actions.push({ op: 'open', type, recordId, startedAt: at, ...fields });

  const update = (type, fields = {}, addRecord = false) =>
    actions.push({
      op: 'update',
      type,
      recordId,
      addRecord,
      fields: { durationSeconds: elapsedSeconds(type), ...fields }
    });

  const close = (type) => {
    if (active[type] && !closing.has(type)) {
      closing.add(type);
      actions.push({ op: 'close', type, recordId, endedAt: at });
    }
  };

  const gpsOn = enabled('gps_unavailable') && config.gpsExpected !== false;
  for (const type of Object.keys(PREF_BY_TYPE)) {
    const isOn = type === 'gps_unavailable' ? gpsOn : enabled(type);
    if (!isOn) close(type);
  }

  const t = sample.temperatureC;
  if (typeof t === 'number' && Number.isFinite(t) && sample.sensors?.ds18b20 === 'ok') {
    const hysteresis = config.hysteresisC;
    const rules = [
      {
        type: 'temperature_high',
        key: 'hi',
        limit: config.maxTempC,
        field: 'peakValue',
        violating: (isActive) => (isActive ? t > config.maxTempC - hysteresis : t > config.maxTempC),
        deviation: (v) => v - config.maxTempC,
        worse: (a, b) => a > b,
        text: `Temperature above ${config.maxTempC} °C`,
        causes: HIGH_CAUSES
      },
      {
        type: 'temperature_low',
        key: 'lo',
        limit: config.minTempC,
        field: 'lowestValue',
        violating: (isActive) => (isActive ? t < config.minTempC + hysteresis : t < config.minTempC),
        deviation: (v) => config.minTempC - v,
        worse: (a, b) => a < b,
        text: `Temperature below ${config.minTempC} °C`,
        causes: LOW_CAUSES
      }
    ];

    for (const rule of rules) {
      const isActive = Boolean(active[rule.type]);
      const result = step(state, rule.key, rule.violating(isActive), isActive, n, n, ts);

      if (result.action === 'raise') {
        const causes =
          sample.lidOpen === true
            ? ['Lid was open at the time of this reading', ...rule.causes]
            : rule.causes;
        open(rule.type, {
          startedAt: new Date(result.since),
          severity: rule.deviation(t) >= CRITICAL_DEVIATION_C ? 'critical' : 'warning',
          [rule.field]: t,
          thresholdValue: rule.limit,
          description: `${rule.text} (reading ${t.toFixed(1)} °C).`,
          probableCauses: causes
        });
      } else if (result.action === 'clear') {
        close(rule.type);
      } else if (isActive) {
        const current = active[rule.type];
        const fields = {};
        const previous = current[rule.field];
        if (previous === null || previous === undefined || rule.worse(t, previous)) {
          fields[rule.field] = t;
        }
        const extreme = fields[rule.field] ?? previous;
        if (rule.deviation(extreme) >= CRITICAL_DEVIATION_C && current.severity !== 'critical') {
          fields.severity = 'critical';
        }
        update(rule.type, fields, fields[rule.field] !== undefined);
      }
    }
  }

  const criticalMs = config.criticalExcursionMinutes * 60000;
  const tempType = active.temperature_high
    ? 'temperature_high'
    : active.temperature_low
      ? 'temperature_low'
      : null;

  if (tempType && !closing.has(tempType) && !active.excursion_duration) {
    const startedMs = new Date(active[tempType].startedAt).getTime();
    if (ts - startedMs >= criticalMs) {
      open('excursion_duration', {
        startedAt: new Date(startedMs + criticalMs),
        severity: 'critical',
        peakValue: wholeMinutes(ts - startedMs),
        thresholdValue: config.criticalExcursionMinutes,
        description: `Temperature has stayed outside the safe range for more than ${config.criticalExcursionMinutes} minutes.`,
        probableCauses: EXCURSION_CAUSES
      });
    }
  }

  if (active.excursion_duration) {
    const highDone = !active.temperature_high || closing.has('temperature_high');
    const lowDone = !active.temperature_low || closing.has('temperature_low');
    if (highDone && lowDone) {
      close('excursion_duration');
    } else if (tempType) {
      const startedMs = new Date(active[tempType].startedAt).getTime();
      update('excursion_duration', { peakValue: wholeMinutes(ts - startedMs) });
    }
  }

  if (enabled('sensor_failure')) {
    const failing = SENSOR_KEYS.filter((key) => FAILING_STATUSES.has(sample.sensors?.[key]));
    const current = active.sensor_failure;
    const result = step(state, 'sensor', failing.length > 0, Boolean(current), n, n, ts);
    const description = `Sensor problem: ${failing.map((key) => `${key} (${sample.sensors[key]})`).join(', ')}.`;
    const severity = failing.includes('ds18b20') ? 'critical' : 'warning';

    if (result.action === 'raise') {
      open('sensor_failure', {
        startedAt: new Date(result.since),
        severity,
        description,
        probableCauses: SENSOR_CAUSES
      });
    } else if (result.action === 'clear') {
      close('sensor_failure');
    } else if (current && failing.length > 0) {
      const fields = {};
      if (current.description !== description) fields.description = description;
      if (current.severity !== severity) fields.severity = severity;
      update('sensor_failure', fields);
    }
  }

  if (enabled('lid_opened') && typeof sample.lidOpen === 'boolean') {
    const current = active.lid_opened;
    if (sample.lidOpen && !current) {
      open('lid_opened', {
        severity: 'warning',
        description: 'Lid opened. This may or may not have affected the stored product.',
        probableCauses: LID_CAUSES
      });
    } else if (!sample.lidOpen && current) {
      close('lid_opened');
    } else if (current) {
      const fields = {};
      if (elapsedSeconds('lid_opened') >= LID_CRITICAL_SECONDS && current.severity !== 'critical') {
        fields.severity = 'critical';
      }
      update('lid_opened', fields);
    }
  }

  if (enabled('shock_detected')) {
    const magnitude = accelMagnitude(sample.accel);
    const byAccel = magnitude !== null && magnitude >= config.shockThresholdG;
    if ((sample.shockDetected === true || byAccel) && ts - state.lastShockAt >= SHOCK_COOLDOWN_MS) {
      state.lastShockAt = ts;
      open('shock_detected', {
        instant: true,
        severity: magnitude !== null && magnitude >= config.shockThresholdG * 2 ? 'critical' : 'warning',
        peakValue: magnitude === null ? null : round2(magnitude),
        thresholdValue: config.shockThresholdG,
        description:
          magnitude === null
            ? 'Possible shock or tilt detected.'
            : `Possible shock or tilt detected (${magnitude.toFixed(1)} g).`,
        probableCauses: SHOCK_CAUSES
      });
    }
  }

  if (enabled('low_battery') && typeof sample.batteryPct === 'number') {
    const pct = sample.batteryPct;
    const current = active.low_battery;
    const isActive = Boolean(current);
    const violating = isActive
      ? pct < config.lowBatteryPct + BATTERY_CLEAR_MARGIN_PCT
      : pct <= config.lowBatteryPct;
    const result = step(state, 'battery', violating, isActive, n, n, ts);
    const severity = pct <= config.criticalBatteryPct ? 'critical' : 'warning';

    if (result.action === 'raise') {
      open('low_battery', {
        startedAt: new Date(result.since),
        severity,
        lowestValue: pct,
        thresholdValue: config.lowBatteryPct,
        description: `Estimated battery is low (${pct}%). The percentage is estimated from voltage.`,
        probableCauses: BATTERY_CAUSES
      });
    } else if (result.action === 'clear') {
      close('low_battery');
    } else if (isActive) {
      const fields = {};
      if (current.lowestValue === null || current.lowestValue === undefined || pct < current.lowestValue) {
        fields.lowestValue = pct;
      }
      if (severity === 'critical' && current.severity !== 'critical') fields.severity = 'critical';
      update('low_battery', fields);
    }
  }

  if (gpsOn) {
    const current = active.gps_unavailable;
    const result = step(
      state,
      'gps',
      sample.gpsFix !== true,
      Boolean(current),
      GPS_RAISE_SAMPLES,
      GPS_CLEAR_SAMPLES,
      ts
    );

    if (result.action === 'raise') {
      open('gps_unavailable', {
        startedAt: new Date(result.since),
        severity: 'info',
        description: 'No valid GPS fix. Location is unknown and the last known position may be outdated.',
        probableCauses: GPS_CAUSES
      });
    } else if (result.action === 'clear') {
      close('gps_unavailable');
    } else if (current) {
      update('gps_unavailable');
    }
  }

  return { state, actions, skipped: false };
};