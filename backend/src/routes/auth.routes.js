import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { loginLimiter, signupLimiter } from '../middleware/rateLimiter.js';
import { changePasswordSchema, loginSchema, signupSchema } from '../validators/auth.schema.js';
import { getMe, postChangePassword, postLogin, postSignup } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginSchema }), postLogin);
router.post('/signup', signupLimiter, validate({ body: signupSchema }), postSignup);
router.get('/me', authenticate, getMe);
router.post('/password', authenticate, validate({ body: changePasswordSchema }), postChangePassword);

export default router;