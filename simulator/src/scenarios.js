const between = (tick, from, to) => tick >= from && tick < to;

export const scenarios = {
  normal: {
    description: 'Stable readings inside 2-8 C with small natural variation, no GPS fix (indoors).',
    ticks: 24,
    control: () => ({})
  },

  'high-excursion': {
    description: 'Temperature climbs above 8 C, stays high, then recovers.',
    ticks: 46,
    control: (t) => (between(t, 6, 32) ? { targetTemp: 11.5 } : {})
  },

  'low-excursion': {
    description: 'Temperature drops below 2 C, stays low, then recovers.',
    ticks: 46,
    control: (t) => (between(t, 6, 32) ? { targetTemp: -2 } : {})
  },

  'humidity-change': {
    description: 'Humidity moves from normal to very humid to dry. No alert is defined for humidity.',
    ticks: 36,
    control: (t) => {
      if (t < 8) return { targetHumidity: 60 };
      if (t < 20) return { targetHumidity: 85 };
      return { targetHumidity: 35 };
    }
  },

  'lid-open': {
    description: 'Lid opens for 12 ticks while temperature rises slightly, then closes.',
    ticks: 30,
    control: (t) => (between(t, 6, 18) ? { lidOpen: true, targetTemp: 7.4 } : {})
  },

  shock: {
    description: 'Shock flag at tick 6 and 7, accelerometer-only spike at 18, severe impact at 24.',
    ticks: 30,
    control: (t) => {
      if (t === 6 || t === 7) return { shock: true };
      if (t === 18) return { accel: { x: 2, y: 2, z: 2 }, motion: true };
      if (t === 24) return { shock: true, accel: { x: 5.4, y: 3, z: 2.2 } };
      return {};
    }
  },

  'gps-fix': {
    description: 'Valid GPS fix the whole time while the truck moves along Mumbai to Pune.',
    ticks: 30,
    control: () => ({ gps: true })
  },

  'gps-no-fix': {
    description: 'No GPS fix at all. Coordinates stay null.',
    ticks: 30,
    control: () => ({ gps: false })
  },

  'gps-loss': {
    description: 'Fix, then a long loss of fix, then fix again. Shows last-known location handling.',
    ticks: 48,
    control: (t) => ({ gps: !between(t, 10, 38) })
  },

  'low-battery': {
    description: 'Battery estimate drains from 28 percent down to 2 percent.',
    ticks: 30,
    control: (t) => ({ battery: Math.max(2, 28 - t) })
  },

  'invalid-sensor': {
    description: 'DS18B20 failure, impossible -127 reading, impossible humidity, then MPU6050 failure.',
    ticks: 38,
    control: (t) => {
      if (between(t, 4, 10)) return { sensors: { ds18b20: 'error' } };
      if (between(t, 14, 18)) return { raw: { temperatureC: -127 } };
      if (between(t, 22, 26)) return { raw: { humidityPct: 180 } };
      if (between(t, 30, 34)) return { sensors: { mpu6050: 'error' } };
      return {};
    }
  },

  duplicates: {
    description: 'Every record is published twice. The backend must store one and report one duplicate.',
    ticks: 12,
    control: () => ({ duplicate: true })
  },

  demo: {
    description: 'Full story: excursion, recovery, lid open, shock, GPS loss, humidity, battery drain.',
    ticks: 110,
    control: (t) => {
      const control = {
        gps: !between(t, 70, 88),
        battery: Math.max(4, Math.round(90 - t * 0.8))
      };
      if (between(t, 8, 30)) control.targetTemp = 11;
      if (between(t, 46, 58)) {
        control.lidOpen = true;
        control.targetTemp = 7.2;
      }
      if (t === 62) control.shock = true;
      if (between(t, 92, 102)) control.targetHumidity = 82;
      return control;
    }
  },

  'offline-sync': {
    description: 'Builds a backlog of past records (with an excursion and a lid event) and uploads it in order.',
    async run({ device, link, options, log }) {
      const count = options.count;
      const spacingMs = options.interval * 1000;
      const startMs = Date.now() - count * spacingMs;

      link.setOffline(true);
      for (let i = 0; i < count; i += 1) {
        const control = {
          gps: true,
          targetTemp: between(i, count * 0.3, count * 0.6) ? 10.5 : 5.2,
          lidOpen: between(i, count * 0.35, count * 0.45)
        };
        link.enqueue(device.step(control, startMs + i * spacingMs));
      }

      const minutes = Math.round(((count * options.interval) / 60) * 10) / 10;
      log(`Buffered ${count} records while offline, covering the last ${minutes} minutes`);

      link.setOffline(false);
      await link.publishStatus(true);
      link.flush();
      log('Connection restored, uploading backlog in order');
    }
  },

  'wifi-drop': {
    description: 'Live data, then a silent connection loss, buffered records, reconnection, and sync.',
    async run({ tick, wait, link, options, log, isStopping }) {
      const before = options.ticks ?? 12;
      const gapTicks = Math.max(1, Math.round(options.gap / options.interval));
      const after = 6;

      for (let i = 0; i < before && !isStopping(); i += 1) {
        await tick({ gps: true });
        await wait();
      }

      link.setOffline(true);
      log(`Connection lost for about ${options.gap}s. Records are being buffered.`);

      for (let i = 0; i < gapTicks && !isStopping(); i += 1) {
        await tick({ gps: true, lidOpen: between(i, gapTicks * 0.4, gapTicks * 0.5) });
        await wait();
      }

      link.setOffline(false);
      await link.publishStatus(true);
      log('Connection restored, uploading buffered records');

      for (let i = 0; i < after && !isStopping(); i += 1) {
        await tick({ gps: true });
        await wait();
      }
    }
  }
};