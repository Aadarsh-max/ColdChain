import { Device } from '../models/Device.js';
import { Alert } from '../models/Alert.js';
import { logger } from '../config/logger.js';
import { bus, BUS_EVENTS } from '../utils/events.js';
import { getSettings } from './settingsService.js';
import { openSystemAlert } from './alertEngine.js';

let timer = null;
let running = false;

const secondsSince = (date, now) => (now.getTime() - new Date(date).getTime()) / 1000;

export const evaluateConnectivity = ({ device, now, settings, activeTypes }) => {
  const result = { markOffline: false, openStale: false, openOffline: false };
  if (!device.lastSeenAt) return result;

  const alertsOn = !settings.alertPreferences || settings.alertPreferences.deviceOffline !== false;

  if (secondsSince(device.lastSeenAt, now) >= settings.offlineAfterSeconds) {
    result.markOffline = device.connectionStatus !== 'offline';
    result.openOffline = alertsOn && !activeTypes.has('device_offline');
  }

  if (device.lastTelemetryAt) {
    result.openStale =
      alertsOn &&
      secondsSince(device.lastTelemetryAt, now) >= settings.staleAfterSeconds &&
      !activeTypes.has('stale_telemetry');
  }

  return result;
};

export const runWatchdogOnce = async (now = new Date()) => {
  const settings = await getSettings();
  const devices = await Device.find({ lastSeenAt: { $ne: null } }).lean();
  if (devices.length === 0) return;

  const activeAlerts = await Alert.find({
    status: 'active',
    type: { $in: ['device_offline', 'stale_telemetry'] }
  })
    .select('deviceId type')
    .lean();

  const byDevice = new Map();
  for (const alert of activeAlerts) {
    if (!byDevice.has(alert.deviceId)) byDevice.set(alert.deviceId, new Set());
    byDevice.get(alert.deviceId).add(alert.type);
  }

  for (const device of devices) {
    const activeTypes = byDevice.get(device.deviceId) || new Set();
    const result = evaluateConnectivity({ device, now, settings, activeTypes });
    const common = {
      deviceId: device.deviceId,
      shipmentId: device.currentShipmentId || null,
      isSimulated: Boolean(device.isSimulated)
    };

    if (result.markOffline) {
      await Device.updateOne({ deviceId: device.deviceId }, { $set: { connectionStatus: 'offline' } });
      bus.emit(BUS_EVENTS.DEVICE_STATUS, {
        deviceId: device.deviceId,
        connectionStatus: 'offline',
        at: now
      });
    }

    if (result.openStale) {
      await openSystemAlert({
        ...common,
        type: 'stale_telemetry',
        severity: 'warning',
        description: `No telemetry received since ${new Date(device.lastTelemetryAt).toISOString()}.`,
        probableCauses: [
          'Device may have lost Wi-Fi or MQTT connection',
          'Sensors or firmware may have stalled (not confirmed)'
        ],
        at: new Date(device.lastTelemetryAt)
      });
    }

    if (result.openOffline) {
      await openSystemAlert({
        ...common,
        type: 'device_offline',
        severity: 'critical',
        description: `Device not heard from since ${new Date(device.lastSeenAt).toISOString()}.`,
        probableCauses: [
          'Power loss or battery depleted',
          'Wi-Fi or broker outage',
          'Device restarting or out of range (not confirmed)'
        ],
        at: new Date(device.lastSeenAt)
      });
    }
  }
};

export const startWatchdog = (intervalMs = 15000) => {
  if (timer) return;
  timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await runWatchdogOnce();
    } catch (err) {
      logger.error(`Watchdog failed: ${err.message}`);
    } finally {
      running = false;
    }
  }, intervalMs);
  logger.info(`Offline watchdog started (every ${intervalMs / 1000}s)`);
};

export const stopWatchdog = () => {
  if (timer) clearInterval(timer);
  timer = null;
};