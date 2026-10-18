const CURVE = [
  [0, 3.0],
  [5, 3.3],
  [15, 3.5],
  [30, 3.6],
  [45, 3.7],
  [60, 3.8],
  [75, 3.9],
  [88, 4.0],
  [100, 4.2]
];

const ROUTE = [
  [19.076, 72.8777],
  [19.033, 73.0297],
  [18.9894, 73.1175],
  [18.7546, 73.4062],
  [18.5204, 73.8567]
];

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

const round = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const pctToVoltage = (pct) => {
  const value = clamp(pct, 0, 100);
  for (let i = 1; i < CURVE.length; i += 1) {
    const [p0, v0] = CURVE[i - 1];
    const [p1, v1] = CURVE[i];
    if (value <= p1) return v0 + ((value - p0) / (p1 - p0)) * (v1 - v0);
  }
  return CURVE[CURVE.length - 1][1];
};

export const createRng = (seed = Date.now()) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const routePoint = (progress) => {
  const p = clamp(progress, 0, 1);
  const segments = ROUTE.length - 1;
  const scaled = p * segments;
  const index = Math.min(segments - 1, Math.floor(scaled));
  const fraction = scaled - index;
  const [lat0, lon0] = ROUTE[index];
  const [lat1, lon1] = ROUTE[index + 1];
  return {
    latitude: lat0 + (lat1 - lat0) * fraction,
    longitude: lon0 + (lon1 - lon0) * fraction
  };
};

export class VirtualDevice {
  constructor({
    deviceId,
    seed,
    batteryPct = 85,
    routeSpeed = 20,
    startProgress = 0,
    firmwareVersion = 'sim-1.0.0'
  }) {
    this.deviceId = deviceId;
    this.firmwareVersion = firmwareVersion;
    this.routeSpeed = routeSpeed;
    this.rng = createRng(seed);
    this.bootId = Date.now().toString(36);
    this.seq = 0;
    this.state = {
      temp: 5.2,
      humidity: 60,
      ambient: 24.5,
      battery: batteryPct,
      progress: startProgress
    };
  }

  noise(amount) {
    return (this.rng() - 0.5) * 2 * amount;
  }

  step(control = {}, at = Date.now()) {
    const s = this.state;

    s.temp += ((control.targetTemp ?? 5.2) - s.temp) * 0.25 + this.noise(0.06);
    s.humidity = clamp(
      s.humidity + ((control.targetHumidity ?? 60) - s.humidity) * 0.2 + this.noise(0.5),
      5,
      99
    );
    s.ambient += ((control.targetAmbient ?? 24.5) - s.ambient) * 0.1 + this.noise(0.1);
    s.battery =
      typeof control.battery === 'number' ? clamp(control.battery, 0, 100) : Math.max(0, s.battery - 0.02);
    s.progress = Math.min(1, s.progress + this.routeSpeed * 0.0004);

    this.seq += 1;

    const sensors = {
      ds18b20: 'ok',
      dht22: 'ok',
      mpu6050: 'ok',
      gps: control.gps ? 'ok' : 'no_fix',
      ...(control.sensors || {})
    };
    const isOk = (name) => sensors[name] === 'ok';

    const gpsOn = isOk('gps');
    const point = gpsOn ? routePoint(s.progress) : null;

    let accel = null;
    let shockDetected = null;
    let motionDetected = null;
    if (isOk('mpu6050')) {
      const spike = control.accel || (control.shock ? { x: 2.4, y: 1.6, z: 2.2 } : null);
      accel = spike || {
        x: round(this.noise(0.04), 3),
        y: round(this.noise(0.04), 3),
        z: round(1 + this.noise(0.04), 3)
      };
      shockDetected = Boolean(control.shock);
      motionDetected = Boolean(control.motion || control.shock || spike);
    }

    const record = {
      schemaVersion: 1,
      deviceId: this.deviceId,
      recordId: `${this.deviceId}-${this.bootId}-${String(this.seq).padStart(6, '0')}`,
      timestamp: new Date(at).toISOString(),
      timeValid: true,
      temperatureC: isOk('ds18b20') ? round(s.temp, 2) : null,
      humidityPct: isOk('dht22') ? round(s.humidity, 1) : null,
      ambientTemperatureC: isOk('dht22') ? round(s.ambient, 2) : null,
      latitude: point ? round(point.latitude + this.noise(0.00002), 6) : null,
      longitude: point ? round(point.longitude + this.noise(0.00002), 6) : null,
      gpsFix: gpsOn,
      gpsSatellites: gpsOn ? 6 + Math.floor(this.rng() * 4) : 0,
      speedKmph: gpsOn ? round(42 + this.noise(4), 1) : null,
      batteryVoltage: round(pctToVoltage(s.battery) + this.noise(0.004), 3),
      batteryPct: Math.round(s.battery),
      lidOpen: Boolean(control.lidOpen),
      motionDetected,
      shockDetected,
      accel,
      sensors,
      network: { wifiConnected: true, mqttConnected: true },
      queuedRecords: 0,
      dataSource: 'live',
      isSimulated: true,
      firmwareVersion: this.firmwareVersion
    };

    return control.raw ? { ...record, ...control.raw } : record;
  }
}