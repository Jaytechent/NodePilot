import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import projectRoutes from '../modules/users/project.routes';
import serverRoutes from '../modules/deployments/server.routes';
import deploymentRoutes from '../modules/deployments/deployment.routes';
import monitoringRoutes from '../modules/monitoring/monitoring.routes';
import billingRoutes from '../modules/billing/billing.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import adapterRoutes from '../modules/adapters/adapter.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/servers', serverRoutes);
router.use('/deployments', deploymentRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/billing', billingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/adapters', adapterRoutes);

export default router;
export const apiRoutes = router;
