import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { acknowledgeAlert, listAlerts } from '../services/alertQueryService.js';

export const getAlerts = asyncHandler(async (req, res) => {
  const result = await listAlerts(req.validated.query);
  res.json(result);
});

export const patchAcknowledge = asyncHandler(async (req, res) => {
  const data = await acknowledgeAlert(req.validated.params.alertId, req.validated.body.acknowledgedBy);
  if (!data) throw new AppError(404, 'Alert not found');
  res.json({ data });
});