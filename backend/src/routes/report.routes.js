import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { shipmentParamsSchema } from '../validators/shipment.schema.js';
import { alertsCsvQuerySchema, readingsCsvQuerySchema } from '../validators/api.schema.js';
import { alertsCsv, readingsCsv, shipmentSummary } from '../controllers/report.controller.js';

const router = Router();

router.get('/shipments/:shipmentId/summary', validate({ params: shipmentParamsSchema }), shipmentSummary);
router.get('/readings.csv', validate({ query: readingsCsvQuerySchema }), readingsCsv);
router.get('/alerts.csv', validate({ query: alertsCsvQuerySchema }), alertsCsv);

export default router;