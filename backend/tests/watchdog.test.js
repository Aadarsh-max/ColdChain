import { describe, it, expect } from 'vitest';
import { evaluateConnectivity } from '../src/services/offlineWatchdog.js';

const NOW = new Date('2026-10-18T10:00:00Z');
const ago = (seconds) => new Date(NOW.getTime() - seconds * 1000);

const settings = {
  staleAfterSeconds: 120,
  offlineAfterSeconds: 300,
  alertPreferences: { deviceOffline: true }
};

const device = (overrides = {}) => ({
  deviceId: 'CC-001',
  connectionStatus: 'online',
  lastSeenAt: ago(10),
  lastTelemetryAt: ago(10),
  ...overrides
});

const evaluate = (dev, activeTypes = new Set(), cfg = settings) =>
  evaluateConnectivity({ device: dev, now: NOW, settings: cfg, activeTypes });

describe('connectivity evaluation', () => {
  it('does nothing for a healthy device', () => {
    expect(evaluate(device())).toEqual({ markOffline: false, openStale: false, openOffline: false });
  });

  it('does nothing for a device never seen', () => {
    expect(evaluate(device({ lastSeenAt: null, lastTelemetryAt: null }))).toEqual({
      markOffline: false,
      openStale: false,
      openOffline: false
    });
  });

  it('flags stale telemetry before the device counts as offline', () => {
    const result = evaluate(device({ lastSeenAt: ago(130), lastTelemetryAt: ago(130) }));
    expect(result.openStale).toBe(true);
    expect(result.openOffline).toBe(false);
    expect(result.markOffline).toBe(false);
  });

  it('marks the device offline and opens both alerts after a long silence', () => {
    const result = evaluate(device({ lastSeenAt: ago(400), lastTelemetryAt: ago(400) }));
    expect(result).toEqual({ markOffline: true, openStale: true, openOffline: true });
  });

  it('does not open duplicate alerts', () => {
    const result = evaluate(
      device({ lastSeenAt: ago(400), lastTelemetryAt: ago(400) }),
      new Set(['device_offline', 'stale_telemetry'])
    );
    expect(result.openStale).toBe(false);
    expect(result.openOffline).toBe(false);
  });

  it('does not re-mark an already offline device', () => {
    const result = evaluate(device({ connectionStatus: 'offline', lastSeenAt: ago(400), lastTelemetryAt: ago(400) }));
    expect(result.markOffline).toBe(false);
  });

  it('respects the alert preference', () => {
    const result = evaluate(
      device({ lastSeenAt: ago(400), lastTelemetryAt: ago(400) }),
      new Set(),
      { ...settings, alertPreferences: { deviceOffline: false } }
    );
    expect(result.openStale).toBe(false);
    expect(result.openOffline).toBe(false);
    expect(result.markOffline).toBe(true);
  });
});