import { Alert } from '../models/Alert.js';
import { logger } from '../config/logger.js';
import { bus, BUS_EVENTS } from '../utils/events.js';
import { createDeviceState, evaluateSample } from './alertRules.js';

const states = new Map();

export const connectivityFlagged = new Set();

const getState = (deviceId) => {
  if (!states.has(deviceId)) states.set(deviceId, createDeviceState());
  return states.get(deviceId);
};

export const buildEvalConfig = (settings, shipment) => ({
  minTempC: shipment ? shipment.minTempC : settings.defaultMinTempC,
  maxTempC: shipment ? shipment.maxTempC : settings.defaultMaxTempC,
  hysteresisC: settings.hysteresisC,
  debounceSamples: settings.excursionDebounceSamples,
  criticalExcursionMinutes: settings.criticalExcursionMinutes,
  lowBatteryPct: settings.lowBatteryPct,
  criticalBatteryPct: settings.criticalBatteryPct,
  shockThresholdG: settings.shockThresholdG,
  gpsExpected: settings.gpsExpected,
  prefs: settings.alertPreferences || {}
});

const applyAction = async ({ action, active, sample, shipment }) => {
  const shipmentId = shipment ? shipment.shipmentId : null;

  if (action.op === 'open') {
    const base = {
      deviceId: sample.deviceId,
      shipmentId,
      type: action.type,
      severity: action.severity,
      startedAt: action.startedAt,
      peakValue: action.peakValue ?? null,
      lowestValue: action.lowestValue ?? null,
      thresholdValue: action.thresholdValue ?? null,
      description: action.description,
      probableCauses: action.probableCauses || [],
      relatedRecordIds: [action.recordId],
      isSimulated: Boolean(sample.isSimulated)
    };

    if (action.instant) {
      base.status = 'resolved';
      base.endedAt = action.startedAt;
      base.durationSeconds = 0;
    }

    const doc = await Alert.create(base);
    const plain = doc.toObject();
    if (!action.instant) active[action.type] = plain;
    logger.info(`Alert opened: ${sample.deviceId} ${action.type} (${action.severity})`);
    bus.emit(BUS_EVENTS.ALERT_OPENED, plain);
    return;
  }

  const current = active[action.type];
  if (!current) return;

  if (action.op === 'update') {
    const keys = Object.keys(action.fields);
    const onlyDuration = keys.length === 1 && keys[0] === 'durationSeconds';
    if (onlyDuration && Math.abs(action.fields.durationSeconds - (current.durationSeconds || 0)) < 30) return;

    const update = { $set: action.fields };
    if (action.addRecord) update.$addToSet = { relatedRecordIds: action.recordId };

    const doc = await Alert.findByIdAndUpdate(current._id, update, { new: true }).lean();
    if (doc) {
      active[action.type] = doc;
      if (!onlyDuration) bus.emit(BUS_EVENTS.ALERT_UPDATED, doc);
    }
    return;
  }

  if (action.op === 'close') {
    const startedMs = new Date(current.startedAt).getTime();
    const endedAt = new Date(Math.max(action.endedAt.getTime(), startedMs));
    const durationSeconds = Math.round((endedAt.getTime() - startedMs) / 1000);

    const doc = await Alert.findByIdAndUpdate(
      current._id,
      {
        $set: { status: 'resolved', endedAt, durationSeconds },
        $addToSet: { relatedRecordIds: action.recordId }
      },
      { new: true }
    ).lean();

    delete active[action.type];
    logger.info(`Alert resolved: ${sample.deviceId} ${action.type} after ${durationSeconds}s`);
    if (doc) bus.emit(BUS_EVENTS.ALERT_CLOSED, doc);
  }
};

export const processSample = async ({ sample, settings, shipment }) => {
  const state = getState(sample.deviceId);

  const activeDocs = await Alert.find({ deviceId: sample.deviceId, status: 'active' }).lean();
  const active = {};
  for (const doc of activeDocs) {
    if (!active[doc.type]) active[doc.type] = doc;
  }

  const config = buildEvalConfig(settings, shipment);
  const { actions } = evaluateSample({ sample, state, active, config });

  for (const action of actions) {
    await applyAction({ action, active, sample, shipment });
  }

  return actions.length;
};

export const openSystemAlert = async ({
  deviceId,
  shipmentId = null,
  type,
  severity,
  description,
  probableCauses = [],
  isSimulated = false,
  at = new Date()
}) => {
  const doc = await Alert.create({
    deviceId,
    shipmentId,
    type,
    severity,
    startedAt: at,
    description,
    probableCauses,
    isSimulated
  });
  connectivityFlagged.add(deviceId);
  const plain = doc.toObject();
  logger.warn(`Alert opened: ${deviceId} ${type} (${severity})`);
  bus.emit(BUS_EVENTS.ALERT_OPENED, plain);
  return plain;
};

export const resolveConnectivityAlerts = async (deviceId, at = new Date()) => {
  const docs = await Alert.find({
    deviceId,
    status: 'active',
    type: { $in: ['device_offline', 'stale_telemetry'] }
  }).lean();

  for (const doc of docs) {
    const startedMs = new Date(doc.startedAt).getTime();
    const endedAt = new Date(Math.max(at.getTime(), startedMs));
    const durationSeconds = Math.round((endedAt.getTime() - startedMs) / 1000);
    const updated = await Alert.findByIdAndUpdate(
      doc._id,
      { $set: { status: 'resolved', endedAt, durationSeconds } },
      { new: true }
    ).lean();
    logger.info(`Alert resolved: ${deviceId} ${doc.type} after ${durationSeconds}s`);
    if (updated) bus.emit(BUS_EVENTS.ALERT_CLOSED, updated);
  }

  connectivityFlagged.delete(deviceId);
  return docs.length;
};