import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { alertParamsSchema, alertsQuerySchema } from '../validators/query.schema.js';
import { acknowledgeBodySchema } from '../validators/api.schema.js';
import { getAlerts, patchAcknowledge } from '../controllers/alert.controller.js';

const router = Router();

router.get('/', validate({ query: alertsQuerySchema }), getAlerts);
router.patch(
  '/:alertId/acknowledge',
  validate({ params: alertParamsSchema, body: acknowledgeBodySchema }),
  patchAcknowledge
);

export default router;