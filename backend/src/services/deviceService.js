import { Device } from '../models/Device.js';
import { Shipment } from '../models/Shipment.js';
import { bus, BUS_EVENTS } from '../utils/events.js';

const SHIPMENT_TTL_MS = 5000;
const shipmentCache = new Map();

export const getActiveShipment = async (deviceId) => {
  const hit = shipmentCache.get(deviceId);
  if (hit && Date.now() - hit.at < SHIPMENT_TTL_MS) return hit.value;

  const value = await Shipment.findOne({
    deviceId,
    status: { $in: ['at_warehouse', 'in_transit'] }
  })
    .sort({ updatedAt: -1 })
    .lean();

  shipmentCache.set(deviceId, { value, at: Date.now() });
  return value;
};

export const clearShipmentCache = () => shipmentCache.clear();

export const updateDeviceFromTelemetry = async ({ sample, shipmentId, receivedAt }) => {
  const previous = await Device.findOne({ deviceId: sample.deviceId })
    .select('lastRecordTimestamp lastLocation connectionStatus')
    .lean();

  const isNewest =
    !previous || !previous.lastRecordTimestamp || sample.timestamp >= previous.lastRecordTimestamp;

  const set = {
    connectionStatus: 'online',
    lastSeenAt: receivedAt,
    lastTelemetryAt: receivedAt,
    currentShipmentId: shipmentId,
    isSimulated: sample.isSimulated
  };

  if (sample.firmwareVersion) set.firmwareVersion = sample.firmwareVersion;

  if (isNewest) {
    set.lastRecordTimestamp = sample.timestamp;
    set.sensorHealth = sample.sensors;
    set.network = sample.network;
    set.queuedRecords = sample.queuedRecords;
  }

  const hasLocation = sample.gpsFix && sample.latitude !== null && sample.longitude !== null;
  const locationIsNewer =
    !previous || !previous.lastLocation || !previous.lastLocation.timestamp ||
    sample.timestamp >= previous.lastLocation.timestamp;

  if (hasLocation && locationIsNewer) {
    set.lastLocation = {
      latitude: sample.latitude,
      longitude: sample.longitude,
      timestamp: sample.timestamp
    };
  }

  await Device.updateOne(
    { deviceId: sample.deviceId },
    { $set: set, $setOnInsert: { name: sample.deviceId } },
    { upsert: true }
  );

  return previous;
};

export const applyDeviceStatus = async (status, receivedAt = new Date()) => {
  const set = { connectionStatus: status.online ? 'online' : 'offline' };
  if (status.online) set.lastSeenAt = receivedAt;
  if (status.firmwareVersion) set.firmwareVersion = status.firmwareVersion;
  if (status.hardwareVersion) set.hardwareVersion = status.hardwareVersion;
  if (status.queuedRecords !== undefined) set.queuedRecords = status.queuedRecords;
  if (status.isSimulated !== undefined) set.isSimulated = status.isSimulated;

  await Device.updateOne(
    { deviceId: status.deviceId },
    { $set: set, $setOnInsert: { name: status.deviceId } },
    { upsert: true }
  );

  bus.emit(BUS_EVENTS.DEVICE_STATUS, {
    deviceId: status.deviceId,
    connectionStatus: set.connectionStatus,
    at: receivedAt
  });
};