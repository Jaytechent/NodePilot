import { Router } from 'express';
import { MonitoringController } from './monitoring.controller';
import { authenticateToken } from '../../middlewares/auth';

const router = Router();
const controller = new MonitoringController();

router.use(authenticateToken as any);

router.get('/:deploymentId/latest', controller.getLatest);
router.get('/:deploymentId/history', controller.getHistory);

export default router;
export const monitoringRoutes = router;
