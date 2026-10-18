import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Telemetry } from '../models/Telemetry.js';
import { telemetrySchema } from '../validators/telemetry.schema.js';
import { isValidCoordinate } from '../utils/geo.js';
import { runExclusive } from '../utils/keyedQueue.js';
import { bus, BUS_EVENTS } from '../utils/events.js';
import { getSettings } from './settingsService.js';
import { getActiveShipment, updateDeviceFromTelemetry } from './deviceService.js';
import { processSample, resolveConnectivityAlerts, connectivityFlagged } from './alertEngine.js';

const DAY_MS = 86400000;
const seenSinceBoot = new Set();

const outOfRange = (value, min, max) =>
  typeof value === 'number' && !(Number.isFinite(value) && value >= min && value <= max);

const extractRecordId = (payload) =>
  payload &&
  typeof payload === 'object' &&
  typeof payload.recordId === 'string' &&
  payload.recordId.length > 0 &&
  payload.recordId.length <= 100
    ? payload.recordId
    : null;

const sanitizeRaw = (payload) => {
  const warnings = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { data: payload, warnings };
  }

  const data = { ...payload };
  const sensors = data.sensors && typeof data.sensors === 'object' ? { ...data.sensors } : null;

  const flag = (field, sensor) => {
    data[field] = null;
    if (sensors) sensors[sensor] = 'error';
    warnings.push(`${field}_out_of_range`);
  };

  if (outOfRange(data.temperatureC, -55, 125)) flag('temperatureC', 'ds18b20');
  if (outOfRange(data.humidityPct, 0, 100)) flag('humidityPct', 'dht22');
  if (outOfRange(data.ambientTemperatureC, -55, 125)) flag('ambientTemperatureC', 'dht22');

  if (sensors) data.sensors = sensors;
  return { data, warnings };
};

export const validateIncoming = ({
  payload,
  topicDeviceId,
  now = new Date(),
  maxFutureSeconds = env.MAX_TIMESTAMP_FUTURE_SECONDS,
  maxAgeDays = env.MAX_TIMESTAMP_AGE_DAYS
}) => {
  const { data: cleaned, warnings } = sanitizeRaw(payload);
  const parsed = telemetrySchema.safeParse(cleaned);

  if (!parsed.success) {
    return {
      ok: false,
      reason: 'invalid_payload',
      details: parsed.error.issues
        .slice(0, 10)
        .map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    };
  }

  const data = parsed.data;

  if (data.deviceId !== topicDeviceId) {
    return { ok: false, reason: 'device_mismatch' };
  }

  if (data.timeValid) {
    const diffMs = data.timestamp.getTime() - now.getTime();
    if (diffMs > maxFutureSeconds * 1000) return { ok: false, reason: 'timestamp_in_future' };
    if (-diffMs > maxAgeDays * DAY_MS) return { ok: false, reason: 'timestamp_too_old' };
  }

  if (!data.gpsFix && data.latitude !== null) {
    data.latitude = null;
    data.longitude = null;
    warnings.push('coordinates_ignored_without_fix');
  }

  if (data.gpsFix && !isValidCoordinate(data.latitude, data.longitude)) {
    data.latitude = null;
    data.longitude = null;
    data.gpsFix = false;
    if (data.sensors.gps === 'ok') data.sensors.gps = 'no_fix';
    warnings.push('invalid_coordinates');
  }

  if (data.sensors.ds18b20 === 'ok' && data.temperatureC === null) {
    data.sensors.ds18b20 = 'error';
    warnings.push('ds18b20_ok_without_value');
  }

  if (data.sensors.dht22 === 'ok' && data.humidityPct === null && data.ambientTemperatureC === null) {
    data.sensors.dht22 = 'error';
    warnings.push('dht22_ok_without_value');
  }

  return { ok: true, data, warnings };
};

const storeSample = async (data, warnings, receivedAt) => {
  if (!data.timeValid) data.timestamp = receivedAt;

  const settings = await getSettings();
  const shipment = await getActiveShipment(data.deviceId);
  const shipmentId = shipment ? shipment.shipmentId : null;

  let stored;
  try {
    stored = await Telemetry.create({ ...data, shipmentId, receivedAt });
  } catch (err) {
    if (err && err.code === 11000) {
      return { status: 'duplicate', recordId: data.recordId };
    }
    throw err;
  }

  const previous = await updateDeviceFromTelemetry({ sample: data, shipmentId, receivedAt });

  const { _id, __v, ...plain } = stored.toObject();

  try {
    await processSample({ sample: plain, settings, shipment });

    const needsCheck =
      !seenSinceBoot.has(data.deviceId) ||
      connectivityFlagged.has(data.deviceId) ||
      (previous && previous.connectionStatus !== 'online');

    if (needsCheck) {
      await resolveConnectivityAlerts(data.deviceId, receivedAt);
    }
    seenSinceBoot.add(data.deviceId);
  } catch (err) {
    logger.error(`Alert processing failed for ${data.deviceId} ${data.recordId}: ${err.message}`);
  }

  bus.emit(BUS_EVENTS.TELEMETRY, {
    ...plain,
    minTempC: shipment ? shipment.minTempC : settings?.defaultMinTempC,
    maxTempC: shipment ? shipment.maxTempC : settings?.defaultMaxTempC
  });

  return { status: 'stored', recordId: data.recordId, warnings };
};

export const ingestTelemetry = async ({ payload, topicDeviceId, now = new Date() }) => {
  const checked = validateIncoming({ payload, topicDeviceId, now });

  if (!checked.ok) {
    return {
      status: 'rejected',
      reason: checked.reason,
      details: checked.details,
      recordId: extractRecordId(payload)
    };
  }

  return runExclusive(checked.data.deviceId, () => storeSample(checked.data, checked.warnings, now));
};