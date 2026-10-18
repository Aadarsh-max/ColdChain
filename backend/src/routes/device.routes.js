import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  deviceParamsSchema,
  eventsQuerySchema,
  readingsQuerySchema
} from '../validators/query.schema.js';
import { devicesQuerySchema, seriesQuerySchema } from '../validators/api.schema.js';
import {
  getDevice,
  getDeviceEvents,
  getDeviceLatest,
  getDeviceReadings,
  getDeviceSeries,
  getDevices
} from '../controllers/device.controller.js';

const router = Router();

router.get('/', validate({ query: devicesQuerySchema }), getDevices);
router.get('/:deviceId', validate({ params: deviceParamsSchema }), getDevice);
router.get('/:deviceId/latest', validate({ params: deviceParamsSchema }), getDeviceLatest);
router.get(
  '/:deviceId/readings',
  validate({ params: deviceParamsSchema, query: readingsQuerySchema }),
  getDeviceReadings
);
router.get(
  '/:deviceId/events',
  validate({ params: deviceParamsSchema, query: eventsQuerySchema }),
  getDeviceEvents
);
router.get(
  '/:deviceId/series',
  validate({ params: deviceParamsSchema, query: seriesQuerySchema }),
  getDeviceSeries
);

export default router;