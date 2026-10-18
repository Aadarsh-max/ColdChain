import { Device } from '../models/Device.js';
import { Telemetry } from '../models/Telemetry.js';
import { Shipment } from '../models/Shipment.js';
import { Alert } from '../models/Alert.js';
import { buildMeta, dateFilter, skipFor } from '../utils/pagination.js';
import { getSettings } from './settingsService.js';

const ageInSeconds = (date, now) =>
  date ? Math.max(0, Math.round((now - new Date(date).getTime()) / 1000)) : null;

export const buildLocation = ({ lastLocation, latest, staleAfterSeconds, now = Date.now() }) => {
  const gpsFix = Boolean(latest && latest.gpsFix);
  const satellites = latest ? latest.gpsSatellites || 0 : 0;

  if (
    !lastLocation ||
    lastLocation.latitude === null ||
    lastLocation.latitude === undefined ||
    lastLocation.longitude === null ||
    lastLocation.longitude === undefined ||
    !lastLocation.timestamp
  ) {
    return {
      available: false,
      status: 'none',
      latitude: null,
      longitude: null,
      timestamp: null,
      ageSeconds: null,
      gpsFix,
      satellites
    };
  }

  const ageSeconds = ageInSeconds(lastLocation.timestamp, now);
  const current = gpsFix && ageSeconds <= staleAfterSeconds;

  return {
    available: true,
    status: current ? 'current' : 'last_known',
    latitude: lastLocation.latitude,
    longitude: lastLocation.longitude,
    timestamp: lastLocation.timestamp,
    ageSeconds,
    gpsFix,
    satellites
  };
};

export const listDevices = async (query) => {
  const filter = {};
  if (query.status) filter.connectionStatus = query.status;
  if (query.isSimulated !== undefined) filter.isSimulated = query.isSimulated;

  const devices = await Device.find(filter).sort({ deviceId: 1 }).select('-__v').lean();
  const now = Date.now();

  return devices.map((device) => ({
    ...device,
    telemetryAgeSeconds: ageInSeconds(device.lastTelemetryAt, now)
  }));
};

export const getDeviceOverview = async (deviceId) => {
  const device = await Device.findOne({ deviceId }).select('-__v').lean();
  if (!device) return null;

  const [settings, latest, shipment, synchronizedCount, lastSynced, alertGroups] = await Promise.all([
    getSettings(),
    Telemetry.findOne({ deviceId }).sort({ timestamp: -1 }).select('-__v').lean(),
    device.currentShipmentId ? Shipment.findOne({ shipmentId: device.currentShipmentId }).select('-__v').lean() : null,
    Telemetry.countDocuments({ deviceId, dataSource: 'synchronized' }),
    Telemetry.findOne({ deviceId, dataSource: 'synchronized' }).sort({ timestamp: -1 }).select('receivedAt').lean(),
    Alert.aggregate([
      { $match: { deviceId, status: 'active' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ])
  ]);

  const now = Date.now();
  const telemetryAgeSeconds = ageInSeconds(device.lastTelemetryAt, now);
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const group of alertGroups) counts[group._id] = group.count;

  return {
    device,
    latest,
    shipment,
    location: buildLocation({
      lastLocation: device.lastLocation,
      latest,
      staleAfterSeconds: settings.staleAfterSeconds,
      now
    }),
    telemetryAgeSeconds,
    isStale: telemetryAgeSeconds === null ? true : telemetryAgeSeconds > settings.staleAfterSeconds,
    sync: {
      queuedRecords: device.queuedRecords || 0,
      synchronizedCount,
      lastSynchronizedAt: lastSynced ? lastSynced.receivedAt : null
    },
    activeAlerts: { ...counts, total: counts.critical + counts.warning + counts.info }
  };
};

export const getLatestReading = async (deviceId) => {
  const [reading, settings] = await Promise.all([
    Telemetry.findOne({ deviceId }).sort({ timestamp: -1 }).select('-__v').lean(),
    getSettings()
  ]);
  if (!reading) return null;
  const ageSeconds = ageInSeconds(reading.timestamp, Date.now());
  return { reading, ageSeconds, isStale: ageSeconds > settings.staleAfterSeconds };
};

export const listReadings = async (base, query) => {
  const filter = { ...base };
  if (query.shipmentId && !filter.shipmentId) filter.shipmentId = query.shipmentId;
  if (query.dataSource) filter.dataSource = query.dataSource;
  if (query.isSimulated !== undefined) filter.isSimulated = query.isSimulated;
  const range = dateFilter(query.from, query.to);
  if (range) filter.timestamp = range;

  const direction = query.sort === 'asc' ? 1 : -1;

  const [data, total] = await Promise.all([
    Telemetry.find(filter)
      .sort({ timestamp: direction, _id: direction })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .select('-__v')
      .lean(),
    Telemetry.countDocuments(filter)
  ]);

  return { data, meta: buildMeta(query.page, query.limit, total) };
};