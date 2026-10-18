import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { getShipmentSummary, streamAlertsCsv, streamReadingsCsv } from '../services/reportService.js';

export const shipmentSummary = asyncHandler(async (req, res) => {
  const data = await getShipmentSummary(req.validated.params.shipmentId);
  if (!data) throw new AppError(404, 'Shipment not found');
  res.json({ data });
});

export const readingsCsv = asyncHandler(async (req, res) => {
  await streamReadingsCsv(res, req.validated.query);
});

export const alertsCsv = asyncHandler(async (req, res) => {
  await streamAlertsCsv(res, req.validated.query);
});