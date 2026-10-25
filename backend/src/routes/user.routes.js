import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  userParamsSchema
} from '../validators/auth.schema.js';
import { getUsers, patchUser, postResetPassword, postUser } from '../controllers/user.controller.js';

const router = Router();

router.use(requireRole('admin'));

router.get('/', getUsers);
router.post('/', validate({ body: createUserSchema }), postUser);
router.patch('/:userId', validate({ params: userParamsSchema, body: updateUserSchema }), patchUser);
router.post(
  '/:userId/password',
  validate({ params: userParamsSchema, body: resetPasswordSchema }),
  postResetPassword
);

export default router;