import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';
import { readingsQuerySchema, shipmentsQuerySchema } from '../validators/query.schema.js';
import {
  createShipmentSchema,
  shipmentParamsSchema,
  updateShipmentSchema
} from '../validators/shipment.schema.js';
import {
  getHistory,
  getShipment,
  getShipmentReadings,
  getShipments,
  patchShipment,
  postShipment
} from '../controllers/shipment.controller.js';

const router = Router();

router.get('/', validate({ query: shipmentsQuerySchema }), getShipments);
router.post('/', requireRole('admin'), validate({ body: createShipmentSchema }), postShipment);
router.get('/:shipmentId', validate({ params: shipmentParamsSchema }), getShipment);
router.patch(
  '/:shipmentId',
  requireRole('admin'),
  validate({ params: shipmentParamsSchema, body: updateShipmentSchema }),
  patchShipment
);
router.get('/:shipmentId/history', validate({ params: shipmentParamsSchema }), getHistory);
router.get(
  '/:shipmentId/readings',
  validate({ params: shipmentParamsSchema, query: readingsQuerySchema }),
  getShipmentReadings
);

export default router;