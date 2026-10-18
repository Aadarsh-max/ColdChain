import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import {
  createShipment,
  getShipmentDetail,
  getShipmentHistory,
  listShipmentReadings,
  listShipments,
  updateShipment
} from '../services/shipmentService.js';

const notFound = () => new AppError(404, 'Shipment not found');

export const getShipments = asyncHandler(async (req, res) => {
  const result = await listShipments(req.validated.query);
  res.json(result);
});

export const getShipment = asyncHandler(async (req, res) => {
  const data = await getShipmentDetail(req.validated.params.shipmentId);
  if (!data) throw notFound();
  res.json({ data });
});

export const postShipment = asyncHandler(async (req, res) => {
  const data = await createShipment(req.validated.body);
  res.status(201).json({ data });
});

export const patchShipment = asyncHandler(async (req, res) => {
  const data = await updateShipment(req.validated.params.shipmentId, req.validated.body);
  if (!data) throw notFound();
  res.json({ data });
});

export const getHistory = asyncHandler(async (req, res) => {
  const data = await getShipmentHistory(req.validated.params.shipmentId);
  if (!data) throw notFound();
  res.json({ data });
});

export const getShipmentReadings = asyncHandler(async (req, res) => {
  const result = await listShipmentReadings(req.validated.params.shipmentId, req.validated.query);
  if (!result) throw notFound();
  res.json(result);
});