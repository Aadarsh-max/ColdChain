import { once } from 'events';
import { Shipment } from '../models/Shipment.js';
import { Alert } from '../models/Alert.js';
import { Telemetry } from '../models/Telemetry.js';
import { csvRow } from '../utils/csv.js';
import { dateFilter } from '../utils/pagination.js';
import { getShipmentRisk } from './riskService.js';
import { EXCURSION_TYPES, outsideSeconds, telemetryStats } from './analyticsService.js';

const MAX_CSV_ROWS = 200000;
const REPORT_DISCLAIMER = 'Educational prototype report. Not a certified cold-chain or regulatory record.';

const safeName = (value) => String(value).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const readingColumns = [
  ['timestamp', (d) => d.timestamp],
  ['receivedAt', (d) => d.receivedAt],
  ['deviceId', (d) => d.deviceId],
  ['shipmentId', (d) => d.shipmentId],
  ['recordId', (d) => d.recordId],
  ['temperatureC', (d) => d.temperatureC],
  ['humidityPct', (d) => d.humidityPct],
  ['ambientTemperatureC', (d) => d.ambientTemperatureC],
  ['latitude', (d) => d.latitude],
  ['longitude', (d) => d.longitude],
  ['gpsFix', (d) => d.gpsFix],
  ['gpsSatellites', (d) => d.gpsSatellites],
  ['batteryVoltage', (d) => d.batteryVoltage],
  ['batteryPct', (d) => d.batteryPct],
  ['lidOpen', (d) => d.lidOpen],
  ['shockDetected', (d) => d.shockDetected],
  ['dataSource', (d) => d.dataSource],
  ['timeValid', (d) => d.timeValid],
  ['isSimulated', (d) => d.isSimulated]
];

const alertColumns = [
  ['startedAt', (d) => d.startedAt],
  ['endedAt', (d) => d.endedAt],
  ['deviceId', (d) => d.deviceId],
  ['shipmentId', (d) => d.shipmentId],
  ['type', (d) => d.type],
  ['severity', (d) => d.severity],
  ['status', (d) => d.status],
  ['durationSeconds', (d) => d.durationSeconds],
  ['peakValue', (d) => d.peakValue],
  ['lowestValue', (d) => d.lowestValue],
  ['thresholdValue', (d) => d.thresholdValue],
  ['acknowledged', (d) => d.acknowledged],
  ['acknowledgedAt', (d) => d.acknowledgedAt],
  ['description', (d) => d.description],
  ['isSimulated', (d) => d.isSimulated]
];

const streamCsv = async (res, filename, columns, cursor) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.write(csvRow(columns.map(([header]) => header)));

  let rows = 0;
  for await (const doc of cursor) {
    const ok = res.write(csvRow(columns.map(([, pick]) => pick(doc))));
    if (!ok) await once(res, 'drain');
    rows += 1;
    if (rows >= MAX_CSV_ROWS) break;
  }
  res.end();
};

export const streamReadingsCsv = async (res, query) => {
  const filter = {};
  if (query.deviceId) filter.deviceId = query.deviceId;
  if (query.shipmentId) filter.shipmentId = query.shipmentId;
  if (query.dataSource) filter.dataSource = query.dataSource;
  if (query.isSimulated !== undefined) filter.isSimulated = query.isSimulated;
  const range = dateFilter(query.from, query.to);
  if (range) filter.timestamp = range;

  const filename = `readings-${safeName(query.shipmentId || query.deviceId)}-${stamp()}.csv`;
  await streamCsv(res, filename, readingColumns, Telemetry.find(filter).sort({ timestamp: 1 }).lean().cursor());
};

export const streamAlertsCsv = async (res, query) => {
  const filter = {};
  if (query.deviceId) filter.deviceId = query.deviceId;
  if (query.shipmentId) filter.shipmentId = query.shipmentId;
  if (query.type) filter.type = query.type;
  const range = dateFilter(query.from, query.to);
  if (range) filter.startedAt = range;

  const filename = `alerts-${safeName(query.shipmentId || query.deviceId || 'all')}-${stamp()}.csv`;
  await streamCsv(res, filename, alertColumns, Alert.find(filter).sort({ startedAt: 1 }).lean().cursor());
};

export const getShipmentSummary = async (shipmentId) => {
  const shipment = await Shipment.findOne({ shipmentId }).select('-__v').lean();
  if (!shipment) return null;

  const [stats, alerts, risk] = await Promise.all([
    telemetryStats({ shipmentId }),
    Alert.find({ shipmentId }).sort({ startedAt: 1 }).select('-__v').lean(),
    getShipmentRisk(shipmentId)
  ]);

  const now = Date.now();
  const from = new Date(stats.firstAt || shipment.startTime || shipment.createdAt);
  const to = new Date(stats.lastAt || now);
  const outside = outsideSeconds(alerts, from, to, now);
  const spanSeconds = Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));

  const durationOf = (alert) =>
    alert.status === 'active'
      ? Math.round((now - new Date(alert.startedAt).getTime()) / 1000)
      : alert.durationSeconds || 0;

  const excursions = alerts
    .filter((alert) => EXCURSION_TYPES.includes(alert.type))
    .map((alert) => ({
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      startedAt: alert.startedAt,
      endedAt: alert.endedAt,
      durationSeconds: durationOf(alert),
      peakValue: alert.peakValue,
      lowestValue: alert.lowestValue,
      acknowledged: alert.acknowledged
    }));

  const eventCounts = {};
  for (const alert of alerts) eventCounts[alert.type] = (eventCounts[alert.type] || 0) + 1;

  return {
    generatedAt: new Date().toISOString(),
    disclaimer: REPORT_DISCLAIMER,
    shipment: {
      shipmentId: shipment.shipmentId,
      trackingCode: shipment.trackingCode,
      productName: shipment.productName,
      productCategory: shipment.productCategory,
      origin: shipment.origin,
      destination: shipment.destination,
      startTime: shipment.startTime,
      expectedArrival: shipment.expectedArrival,
      deviceId: shipment.deviceId,
      status: shipment.status,
      minTempC: shipment.minTempC,
      maxTempC: shipment.maxTempC,
      isSimulated: Boolean(shipment.isSimulated)
    },
    stats: {
      ...stats,
      monitoredSeconds: spanSeconds,
      outsideSeconds: outside,
      timeInRangePct:
        spanSeconds > 0 ? Math.round((1 - Math.min(outside / spanSeconds, 1)) * 1000) / 10 : null
    },
    excursions,
    eventCounts,
    statusHistory: shipment.history,
    risk
  };
};