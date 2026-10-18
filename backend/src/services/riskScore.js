export const RISK_WEIGHTS = Object.freeze({
  deviation: 25,
  duration: 30,
  sensors: 15,
  battery: 10,
  shock: 10,
  disconnection: 10
});

export const DEFAULT_RISK_CONFIG = Object.freeze({
  fullDeviationC: 5,
  fullExcursionMinutes: 60,
  fullShockCount: 2,
  fullDisconnectMinutes: 30,
  lowBatteryPct: 20,
  criticalBatteryPct: 10
});

export const RISK_DISCLAIMER =
  'Project-defined operational indicator. It is not a scientifically validated probability of product damage.';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const round1 = (value) => Math.round(value * 10) / 10;

export const getRiskLevel = (score) => {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
};

export const computeRiskScore = (input = {}, overrides = {}) => {
  const cfg = { ...DEFAULT_RISK_CONFIG, ...overrides };
  const W = RISK_WEIGHTS;

  const maxDeviationC = num(input.maxDeviationC);
  const excursionMinutes = num(input.excursionMinutes);
  const shockCount = num(input.shockCount);
  const disconnectedMinutes = num(input.disconnectedMinutes);
  const failedSensors = Array.isArray(input.failedSensors) ? input.failedSensors : [];
  const batteryPct = typeof input.batteryPct === 'number' ? input.batteryPct : null;

  const sensorPoints = failedSensors.includes('ds18b20')
    ? W.sensors
    : Math.min(W.sensors, failedSensors.length * 5);

  let batteryPoints = 0;
  if (batteryPct !== null) {
    if (batteryPct <= cfg.criticalBatteryPct) batteryPoints = W.battery;
    else if (batteryPct <= cfg.lowBatteryPct) batteryPoints = W.battery / 2;
  }

  const factors = [
    {
      key: 'deviation',
      label: 'Temperature deviation',
      weight: W.deviation,
      points: round1(W.deviation * clamp01(maxDeviationC / cfg.fullDeviationC)),
      detail: `Largest deviation outside limits: ${round1(maxDeviationC)} °C (full points at ${cfg.fullDeviationC} °C)`
    },
    {
      key: 'duration',
      label: 'Excursion duration',
      weight: W.duration,
      points: round1(W.duration * clamp01(excursionMinutes / cfg.fullExcursionMinutes)),
      detail: `Total time outside limits: ${round1(excursionMinutes)} min (full points at ${cfg.fullExcursionMinutes} min)`
    },
    {
      key: 'sensors',
      label: 'Sensor failures',
      weight: W.sensors,
      points: sensorPoints,
      detail: failedSensors.length
        ? `Failing sensors: ${failedSensors.join(', ')}`
        : 'No sensor failures'
    },
    {
      key: 'battery',
      label: 'Low battery',
      weight: W.battery,
      points: batteryPoints,
      detail: batteryPct === null ? 'Battery level unknown' : `Estimated battery: ${batteryPct}%`
    },
    {
      key: 'shock',
      label: 'Shock events',
      weight: W.shock,
      points: round1(W.shock * clamp01(shockCount / cfg.fullShockCount)),
      detail: `${shockCount} shock event(s) (full points at ${cfg.fullShockCount})`
    },
    {
      key: 'disconnection',
      label: 'Disconnection',
      weight: W.disconnection,
      points: round1(W.disconnection * clamp01(disconnectedMinutes / cfg.fullDisconnectMinutes)),
      detail: `Offline time: ${round1(disconnectedMinutes)} min (full points at ${cfg.fullDisconnectMinutes} min)`
    }
  ];

  const total = factors.reduce((sum, factor) => sum + factor.points, 0);
  const score = Math.min(100, Math.max(0, Math.round(total)));

  return { score, level: getRiskLevel(score), factors, disclaimer: RISK_DISCLAIMER };
};