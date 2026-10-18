import { Telemetry } from '../models/Telemetry.js';
import { Alert } from '../models/Alert.js';
import { Shipment } from '../models/Shipment.js';
import { Device } from '../models/Device.js';
import { AppError } from '../utils/AppError.js';
import { getSettings } from './settingsService.js';

export const TEMP_TYPES = ['temperature_high', 'temperature_low'];
export const EXCURSION_TYPES = [...TEMP_TYPES, 'excursion_duration'];

const round = (value, places) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const mergeIntervals = (intervals) => {
  const sorted = intervals.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
};

export const outsideSeconds = (alerts, from, to, now = Date.now()) => {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const intervals = [];

  for (const alert of alerts) {
    if (!TEMP_TYPES.includes(alert.type)) continue;
    const startMs = Math.max(new Date(alert.startedAt).getTime(), fromMs);
    const rawEnd = alert.endedAt ? new Date(alert.endedAt).getTime() : Math.min(now, toMs);
    const endMs = Math.min(rawEnd, toMs);
    if (endMs > startMs) intervals.push([startMs, endMs]);
  }

  const total = mergeIntervals(intervals).reduce((sum, [start, end]) => sum + (end - start), 0);
  return Math.round(total / 1000);
};

export const buildGaps = (points, bucketMs, thresholdMs) => {
  const gaps = [];
  for (let i = 1; i < points.length; i += 1) {
    const previous = Date.parse(points[i - 1].t);
    const current = Date.parse(points[i].t);
    if (current - previous > thresholdMs) {
      const start = previous + bucketMs;
      gaps.push({
        from: new Date(start).toISOString(),
        to: new Date(current).toISOString(),
        seconds: Math.round((current - start) / 1000)
      });
    }
  }
  return gaps;
};

export const downsample = (items, max) => {
  if (items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  const result = [];
  for (let i = 0; i < max; i += 1) result.push(items[Math.round(i * step)]);
  return result;
};

export const telemetryStats = async (match) => {
  const [row] = await Telemetry.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        minTempC: { $min: '$temperatureC' },
        maxTempC: { $max: '$temperatureC' },
        avgTempC: { $avg: '$temperatureC' },
        minHumidityPct: { $min: '$humidityPct' },
        maxHumidityPct: { $max: '$humidityPct' },
        avgHumidityPct: { $avg: '$humidityPct' },
        firstAt: { $min: '$timestamp' },
        lastAt: { $max: '$timestamp' },
        simulatedCount: { $sum: { $cond: ['$isSimulated', 1, 0] } },
        synchronizedCount: { $sum: { $cond: [{ $eq: ['$dataSource', 'synchronized'] }, 1, 0] } }
      }
    }
  ]);

  if (!row) {
    return {
      count: 0,
      minTempC: null,
      maxTempC: null,
      avgTempC: null,
      minHumidityPct: null,
      maxHumidityPct: null,
      avgHumidityPct: null,
      firstAt: null,
      lastAt: null,
      simulatedCount: 0,
      synchronizedCount: 0
    };
  }

  return {
    count: row.count,
    minTempC: round(row.minTempC, 2),
    maxTempC: round(row.maxTempC, 2),
    avgTempC: round(row.avgTempC, 2),
    minHumidityPct: round(row.minHumidityPct, 1),
    maxHumidityPct: round(row.maxHumidityPct, 1),
    avgHumidityPct: round(row.avgHumidityPct, 1),
    firstAt: row.firstAt,
    lastAt: row.lastAt,
    simulatedCount: row.simulatedCount,
    synchronizedCount: row.synchronizedCount
  };
};

export const resolveLimits = async ({ deviceId, shipmentId }) => {
  let shipment = null;

  if (shipmentId) {
    shipment = await Shipment.findOne({ shipmentId }).select('shipmentId minTempC maxTempC').lean();
  } else {
    const device = await Device.findOne({ deviceId }).select('currentShipmentId').lean();
    if (device && device.currentShipmentId) {
      shipment = await Shipment.findOne({ shipmentId: device.currentShipmentId })
        .select('shipmentId minTempC maxTempC')
        .lean();
    }
  }

  if (shipment) {
    return { minTempC: shipment.minTempC, maxTempC: shipment.maxTempC, source: 'shipment', shipmentId: shipment.shipmentId };
  }

  const settings = await getSettings();
  return { minTempC: settings.defaultMinTempC, maxTempC: settings.defaultMaxTempC, source: 'default', shipmentId: null };
};

export const getSeries = async ({ deviceId, from, to, points, shipmentId }) => {
  const end = to || new Date();
  const start = from || new Date(end.getTime() - 86400000);
  if (start >= end) throw new AppError(400, 'from must be before to');

  const bucketMs = Math.max(1000, Math.ceil((end.getTime() - start.getTime()) / points));
  const match = { deviceId, timestamp: { $gte: start, $lte: end } };
  if (shipmentId) match.shipmentId = shipmentId;

  const [rows, stats, limits, excursionDocs, settings] = await Promise.all([
    Telemetry.aggregate([
      { $match: match },
      { $addFields: { ms: { $toLong: '$timestamp' } } },
      {
        $group: {
          _id: { $subtract: ['$ms', { $mod: ['$ms', bucketMs] }] },
          temperatureC: { $avg: '$temperatureC' },
          tempMin: { $min: '$temperatureC' },
          tempMax: { $max: '$temperatureC' },
          humidityPct: { $avg: '$humidityPct' },
          ambient: { $avg: '$ambientTemperatureC' },
          samples: { $sum: 1 },
          lidOpen: { $max: { $cond: [{ $eq: ['$lidOpen', true] }, 1, 0] } },
          simulated: { $max: { $cond: ['$isSimulated', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    telemetryStats(match),
    resolveLimits({ deviceId, shipmentId }),
    Alert.find({
      deviceId,
      type: { $in: EXCURSION_TYPES },
      startedAt: { $lte: end },
      $or: [{ endedAt: null }, { endedAt: { $gte: start } }]
    })
      .sort({ startedAt: 1 })
      .select('-__v')
      .lean(),
    getSettings()
  ]);

  const seriesPoints = rows.map((row) => ({
    t: new Date(row._id).toISOString(),
    temperatureC: round(row.temperatureC, 2),
    tempMinC: round(row.tempMin, 2),
    tempMaxC: round(row.tempMax, 2),
    humidityPct: round(row.humidityPct, 1),
    ambientTemperatureC: round(row.ambient, 2),
    samples: row.samples,
    lidOpen: row.lidOpen === 1,
    simulated: row.simulated === 1
  }));

  const gapThresholdMs = Math.max(bucketMs * 1.5, settings.staleAfterSeconds * 1000);
  const outside = outsideSeconds(excursionDocs, start, end);

  return {
    deviceId,
    from: start,
    to: end,
    bucketSeconds: Math.round(bucketMs / 1000),
    limits,
    points: seriesPoints,
    gaps: buildGaps(seriesPoints, bucketMs, gapThresholdMs),
    excursions: excursionDocs,
    stats: { ...stats, outsideSeconds: outside },
    hasSimulated: stats.simulatedCount > 0
  };
};