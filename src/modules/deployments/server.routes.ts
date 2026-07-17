import { Router } from 'express';
import { ServerController } from './server.controller';
import { authenticateToken } from '../../middlewares/auth';

const router = Router();
const controller = new ServerController();

router.use(authenticateToken as any);

router.post('/', controller.create);
router.get('/', controller.listByProject);
router.get('/:id', controller.get);
router.post('/:id/reboot', controller.reboot);
router.delete('/:id', controller.delete);

export default router;
export const serverRoutes = router;
