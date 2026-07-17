import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticateToken } from '../../middlewares/auth';

const router = Router();
const controller = new ProjectController();

// All projects routes are authenticated
router.use(authenticateToken as any);

router.post('/', controller.create as any);
router.get('/', controller.list as any);
router.get('/:id', controller.get as any);
router.put('/:id', controller.update as any);
router.delete('/:id', controller.delete as any);

export default router;
export const projectRoutes = router;
