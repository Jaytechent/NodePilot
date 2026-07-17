import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticateToken } from '../../middlewares/auth';

const router = Router();
const controller = new NotificationController();

router.use(authenticateToken as any);

router.get('/logs', controller.getLogs);
router.get('/settings', controller.getSettings);

export default router;
export const notificationRoutes = router;
