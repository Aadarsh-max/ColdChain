import { asyncHandler } from '../utils/asyncHandler.js';
import { getDashboardSummary } from '../services/dashboardService.js';

export const getSummary = asyncHandler(async (req, res) => {
  const data = await getDashboardSummary();
  res.json({ data });
});