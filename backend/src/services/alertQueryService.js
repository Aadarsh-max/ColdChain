import { Alert } from '../models/Alert.js';
import { bus, BUS_EVENTS } from '../utils/events.js';
import { buildMeta, dateFilter, skipFor } from '../utils/pagination.js';

const buildFilter = (query, forcedDeviceId) => {
  const filter = {};
  const deviceId = forcedDeviceId || query.deviceId;
  if (deviceId) filter.deviceId = deviceId;
  if (query.shipmentId) filter.shipmentId = query.shipmentId;
  if (query.type) filter.type = query.type;
  if (query.severity) filter.severity = query.severity;
  if (query.status) filter.status = query.status;
  if (query.acknowledged !== undefined) filter.acknowledged = query.acknowledged;
  if (query.isSimulated !== undefined) filter.isSimulated = query.isSimulated;
  const range = dateFilter(query.from, query.to);
  if (range) filter.startedAt = range;
  return filter;
};

export const listAlerts = async (query, forcedDeviceId) => {
  const filter = buildFilter(query, forcedDeviceId);

  const [data, total, active, activeCritical, unacknowledged] = await Promise.all([
    Alert.find(filter)
      .sort({ startedAt: -1, _id: -1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .select('-__v')
      .lean(),
    Alert.countDocuments(filter),
    Alert.countDocuments({ status: 'active' }),
    Alert.countDocuments({ status: 'active', severity: 'critical' }),
    Alert.countDocuments({ status: 'active', acknowledged: false })
  ]);

  return {
    data,
    meta: buildMeta(query.page, query.limit, total),
    summary: { active, activeCritical, unacknowledged }
  };
};

export const acknowledgeAlert = async (alertId, acknowledgedBy) => {
  const existing = await Alert.findById(alertId).lean();
  if (!existing) return null;
  if (existing.acknowledged) return existing;

  const updated = await Alert.findByIdAndUpdate(
    alertId,
    {
      $set: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: acknowledgedBy || 'dashboard'
      }
    },
    { new: true }
  ).lean();

  if (updated) bus.emit(BUS_EVENTS.ALERT_UPDATED, updated);
  return updated;
};