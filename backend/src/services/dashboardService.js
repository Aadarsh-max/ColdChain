import { Device } from '../models/Device.js';
import { Shipment } from '../models/Shipment.js';
import { Alert } from '../models/Alert.js';
import { getShipmentRisk } from './riskService.js';
import { RISK_DISCLAIMER, getRiskLevel } from './riskScore.js';

const ACTIVE_STATUSES = ['at_warehouse', 'in_transit'];
const EXCURSION_TYPES = ['temperature_high', 'temperature_low', 'excursion_duration'];

export const getDashboardSummary = async () => {
  const [
    deviceGroups,
    newest,
    simulatedDevices,
    activeShipmentCount,
    shipments,
    severityGroups,
    activeExcursions,
    totalExcursions,
    unacknowledged
  ] = await Promise.all([
    Device.aggregate([{ $group: { _id: '$connectionStatus', count: { $sum: 1 } } }]),
    Device.findOne({ lastTelemetryAt: { $ne: null } })
      .sort({ lastTelemetryAt: -1 })
      .select('deviceId lastTelemetryAt isSimulated')
      .lean(),
    Device.countDocuments({ isSimulated: true }),
    Shipment.countDocuments({ status: { $in: ACTIVE_STATUSES } }),
    Shipment.find({ status: { $in: ACTIVE_STATUSES } })
      .sort({ updatedAt: -1 })
      .limit(25)
      .select('shipmentId productName deviceId status isSimulated')
      .lean(),
    Alert.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
    Alert.countDocuments({ status: 'active', type: { $in: EXCURSION_TYPES } }),
    Alert.countDocuments({ type: { $in: ['temperature_high', 'temperature_low'] } }),
    Alert.countDocuments({ status: 'active', acknowledged: false })
  ]);

  const devices = { total: 0, online: 0, offline: 0, unknown: 0 };
  for (const group of deviceGroups) {
    devices.total += group.count;
    if (group._id in devices) devices[group._id] = group.count;
    else devices.unknown += group.count;
  }

  const severity = { critical: 0, warning: 0, info: 0 };
  for (const group of severityGroups) severity[group._id] = group.count;

  const scored = await Promise.all(
    shipments.map(async (shipment) => {
      const risk = await getShipmentRisk(shipment.shipmentId);
      return {
        shipmentId: shipment.shipmentId,
        productName: shipment.productName,
        deviceId: shipment.deviceId,
        status: shipment.status,
        isSimulated: Boolean(shipment.isSimulated),
        score: risk ? risk.score : 0,
        level: risk ? risk.level : 'low'
      };
    })
  );

  const byLevel = { low: 0, moderate: 0, high: 0, critical: 0 };
  let maxScore = 0;
  for (const item of scored) {
    byLevel[item.level] += 1;
    if (item.score > maxScore) maxScore = item.score;
  }

  return {
    generatedAt: new Date().toISOString(),
    devices,
    shipments: { active: activeShipmentCount },
    alerts: {
      active: severity.critical + severity.warning + severity.info,
      critical: severity.critical,
      warning: severity.warning,
      info: severity.info,
      unacknowledged,
      activeExcursions,
      totalExcursions
    },
    latestTelemetry: newest
      ? { at: newest.lastTelemetryAt, deviceId: newest.deviceId, isSimulated: Boolean(newest.isSimulated) }
      : null,
    demo: { simulatedDevices, active: simulatedDevices > 0 },
    risk: {
      maxScore,
      maxLevel: getRiskLevel(maxScore),
      byLevel,
      shipments: scored,
      disclaimer: RISK_DISCLAIMER
    }
  };
};