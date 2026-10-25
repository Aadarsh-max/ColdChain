import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import deviceRoutes from './device.routes.js';
import shipmentRoutes from './shipment.routes.js';
import alertRoutes from './alert.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

router.use(authenticate);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/alerts', alertRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportRoutes);

export default router;