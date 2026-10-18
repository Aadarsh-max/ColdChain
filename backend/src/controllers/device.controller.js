import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { getDeviceOverview, getLatestReading, listDevices, listReadings } from '../services/deviceQueryService.js';
import { listAlerts } from '../services/alertQueryService.js';
import { getSeries } from '../services/analyticsService.js';

export const getDevices = asyncHandler(async (req, res) => {
  const data = await listDevices(req.validated.query);
  res.json({ data });
});

export const getDevice = asyncHandler(async (req, res) => {
  const data = await getDeviceOverview(req.validated.params.deviceId);
  if (!data) throw new AppError(404, 'Device not found');
  res.json({ data });
});

export const getDeviceLatest = asyncHandler(async (req, res) => {
  const data = await getLatestReading(req.validated.params.deviceId);
  if (!data) throw new AppError(404, 'No readings for this device');
  res.json({ data });
});

export const getDeviceReadings = asyncHandler(async (req, res) => {
  const { deviceId } = req.validated.params;
  const result = await listReadings({ deviceId }, req.validated.query);
  res.json(result);
});

export const getDeviceEvents = asyncHandler(async (req, res) => {
  const { deviceId } = req.validated.params;
  const result = await listAlerts(req.validated.query, deviceId);
  res.json(result);
});

export const getDeviceSeries = asyncHandler(async (req, res) => {
  const { deviceId } = req.validated.params;
  const data = await getSeries({ deviceId, ...req.validated.query });
  res.json({ data });
});