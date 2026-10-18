import { Shipment } from '../models/Shipment.js';
import { Device } from '../models/Device.js';
import { Alert } from '../models/Alert.js';
import { Telemetry } from '../models/Telemetry.js';
import { AppError } from '../utils/AppError.js';
import { bus, BUS_EVENTS } from '../utils/events.js';
import { buildMeta, escapeRegex, skipFor } from '../utils/pagination.js';
import { clearShipmentCache } from './deviceService.js';
import { getShipmentRisk } from './riskService.js';
import { downsample, outsideSeconds, telemetryStats } from './analyticsService.js';
import { listReadings } from './deviceQueryService.js';

const ACTIVE_STATUSES = ['at_warehouse', 'in_transit'];

const assertDeviceFree = async (deviceId, exceptShipmentId) => {
  if (!deviceId) return;
  const filter = { deviceId, status: { $in: ACTIVE_STATUSES } };
  if (exceptShipmentId) filter.shipmentId = { $ne: exceptShipmentId };
  const clash = await Shipment.findOne(filter).select('shipmentId').lean();
  if (clash) {
    throw new AppError(409, `Device ${deviceId} is already assigned to active shipment ${clash.shipmentId}`);
  }
};

export const listShipments = async (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.deviceId) filter.deviceId = query.deviceId;
  if (query.isSimulated !== undefined) filter.isSimulated = query.isSimulated;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ shipmentId: pattern }, { trackingCode: pattern }, { productName: pattern }];
  }

  const [data, total] = await Promise.all([
    Shipment.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .select('-__v')
      .lean(),
    Shipment.countDocuments(filter)
  ]);

  return { data, meta: buildMeta(query.page, query.limit, total) };
};

export const getShipmentDetail = async (shipmentId) => {
  const shipment = await Shipment.findOne({ shipmentId }).select('-__v').lean();
  if (!shipment) return null;

  const [risk, activeAlerts, device] = await Promise.all([
    getShipmentRisk(shipmentId),
    Alert.countDocuments({ shipmentId, status: 'active' }),
    shipment.deviceId
      ? Device.findOne({ deviceId: shipment.deviceId })
          .select('deviceId name connectionStatus lastSeenAt lastLocation isSimulated')
          .lean()
      : null
  ]);

  return { shipment, risk, activeAlerts, device };
};

export const createShipment = async (input) => {
  const { statusNote, statusLocation, ...rest } = input;
  const status = rest.status || 'planned';

  const exists = await Shipment.exists({ shipmentId: rest.shipmentId });
  if (exists) throw new AppError(409, `Shipment ${rest.shipmentId} already exists`);

  if (ACTIVE_STATUSES.includes(status)) await assertDeviceFree(rest.deviceId, null);

  const doc = await Shipment.create({
    ...rest,
    status,
    history: [
      {
        status,
        location: statusLocation || rest.origin.name,
        note: statusNote || 'Shipment created',
        at: new Date()
      }
    ]
  });

  clearShipmentCache();
  const plain = doc.toObject();
  bus.emit(BUS_EVENTS.SHIPMENT_UPDATED, plain);
  return plain;
};

export const updateShipment = async (shipmentId, input) => {
  const existing = await Shipment.findOne({ shipmentId });
  if (!existing) return null;

  const { statusNote, statusLocation, ...changes } = input;
  const previousStatus = existing.status;
  const nextStatus = changes.status ?? existing.status;
  const nextDevice = changes.deviceId !== undefined ? changes.deviceId : existing.deviceId;
  const nextMin = changes.minTempC ?? existing.minTempC;
  const nextMax = changes.maxTempC ?? existing.maxTempC;

  if (nextMin >= nextMax) throw new AppError(400, 'maxTempC must be greater than minTempC');
  if (ACTIVE_STATUSES.includes(nextStatus) && nextDevice) await assertDeviceFree(nextDevice, shipmentId);

  existing.set(changes);

  if (changes.status && changes.status !== previousStatus) {
    existing.history.push({
      status: changes.status,
      location: statusLocation || '',
      note: statusNote || '',
      at: new Date()
    });
  }

  await existing.save();

  if (!ACTIVE_STATUSES.includes(existing.status) && existing.deviceId) {
    await Device.updateOne(
      { deviceId: existing.deviceId, currentShipmentId: shipmentId },
      { $set: { currentShipmentId: null } }
    );
  }

  clearShipmentCache();
  const plain = existing.toObject();
  bus.emit(BUS_EVENTS.SHIPMENT_UPDATED, plain);
  return plain;
};

export const getShipmentHistory = async (shipmentId) => {
  const shipment = await Shipment.findOne({ shipmentId })
    .select('shipmentId status history minTempC maxTempC deviceId startTime createdAt')
    .lean();
  if (!shipment) return null;

  const [stats, routeDocs, alerts] = await Promise.all([
    telemetryStats({ shipmentId }),
    Telemetry.find({ shipmentId, gpsFix: true, latitude: { $ne: null }, longitude: { $ne: null } })
      .sort({ timestamp: 1 })
      .limit(5000)
      .select('timestamp latitude longitude speedKmph')
      .lean(),
    Alert.find({ shipmentId }).sort({ startedAt: -1 }).limit(200).select('-__v').lean()
  ]);

  const route = downsample(
    routeDocs.map((doc) => ({
      timestamp: doc.timestamp,
      latitude: doc.latitude,
      longitude: doc.longitude,
      speedKmph: doc.speedKmph
    })),
    500
  );

  const from = stats.firstAt || shipment.startTime || shipment.createdAt;
  const to = stats.lastAt || new Date();

  return {
    shipmentId,
    statusHistory: shipment.history,
    limits: { minTempC: shipment.minTempC, maxTempC: shipment.maxTempC },
    stats: { ...stats, outsideSeconds: outsideSeconds(alerts, new Date(from), new Date(to)) },
    route,
    alerts
  };
};

export const listShipmentReadings = async (shipmentId, query) => {
  const exists = await Shipment.exists({ shipmentId });
  if (!exists) return null;
  return listReadings({ shipmentId }, query);
};