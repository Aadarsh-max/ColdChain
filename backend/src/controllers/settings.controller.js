import { asyncHandler } from '../utils/asyncHandler.js';
import { getSettingsDoc, updateSettings } from '../services/settingsAdminService.js';

export const getSettingsHandler = asyncHandler(async (req, res) => {
  const data = await getSettingsDoc();
  res.json({ data });
});

export const patchSettingsHandler = asyncHandler(async (req, res) => {
  const data = await updateSettings(req.validated.body);
  res.json({ data });
});