import { Alert } from '../models/Alert.js';
import { Device } from '../models/Device.js';
import { Shipment } from '../models/Shipment.js';
import { Telemetry } from '../models/Telemetry.js';
import { getSettings } from './settingsService.js';
import { computeRiskScore } from './riskScore.js';

const FAILING = new Set(['error', 'not_found', 'stale']);

export const buildRiskInput = async (shipmentId) => {
  const shipment = await Shipment.findOne({ shipmentId }).lean();
  if (!shipment) return null;

  const alerts = await Alert.find({ shipmentId }).lean();
  const now = Date.now();

  const minutesOf = (alert) =>
    (alert.status === 'active'
      ? (now - new Date(alert.startedAt).getTime()) / 1000
      : alert.durationSeconds || 0) / 60;

  let excursionMinutes = 0;
  let maxDeviationC = 0;
  let shockCount = 0;
  let disconnectedMinutes = 0;

  for (const alert of alerts) {
    if (alert.type === 'temperature_high') {
      excursionMinutes += minutesOf(alert);
      if (alert.peakValue != null && alert.thresholdValue != null) {
        maxDeviationC = Math.max(maxDeviationC, alert.peakValue - alert.thresholdValue);
      }
    } else if (alert.type === 'temperature_low') {
      excursionMinutes += minutesOf(alert);
      if (alert.lowestValue != null && alert.thresholdValue != null) {
        maxDeviationC = Math.max(maxDeviationC, alert.thresholdValue - alert.lowestValue);
      }
    } else if (alert.type === 'shock_detected') {
      shockCount += 1;
    } else if (alert.type === 'device_offline') {
      disconnectedMinutes += minutesOf(alert);
    }
  }

  let failedSensors = [];
  let batteryPct = null;

  if (shipment.deviceId) {
    const device = await Device.findOne({ deviceId: shipment.deviceId }).select('sensorHealth').lean();
    failedSensors = Object.entries((device && device.sensorHealth) || {})
      .filter(([, status]) => FAILING.has(status))
      .map(([sensor]) => sensor);

    const latest = await Telemetry.findOne({ deviceId: shipment.deviceId, batteryPct: { $ne: null } })
      .sort({ timestamp: -1 })
      .select('batteryPct')
      .lean();
    batteryPct = latest ? latest.batteryPct : null;
  }

  return {
    shipment,
    input: { maxDeviationC, excursionMinutes, failedSensors, batteryPct, shockCount, disconnectedMinutes }
  };
};

export const getShipmentRisk = async (shipmentId) => {
  const built = await buildRiskInput(shipmentId);
  if (!built) return null;
  const settings = await getSettings();
  const risk = computeRiskScore(built.input, {
    lowBatteryPct: settings.lowBatteryPct,
    criticalBatteryPct: settings.criticalBatteryPct
  });
  return { shipmentId, ...risk, input: built.input };
};