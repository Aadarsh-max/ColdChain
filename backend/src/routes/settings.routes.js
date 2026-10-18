import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../validators/api.schema.js';
import { getSettingsHandler, patchSettingsHandler } from '../controllers/settings.controller.js';

const router = Router();

router.get('/', getSettingsHandler);
router.patch('/', validate({ body: updateSettingsSchema }), patchSettingsHandler);

export default router;