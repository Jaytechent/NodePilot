import { Router } from 'express';
import { AdapterController } from './adapter.controller';
import { authenticateToken } from '../../middlewares/auth';

const router = Router();
const controller = new AdapterController();

router.use(authenticateToken as any);

router.get('/', controller.list);
router.get('/:id', controller.get);

export default router;
export const adapterRoutes = router;
