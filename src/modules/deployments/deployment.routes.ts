import { Router } from 'express';
import { DeploymentController } from './deployment.controller';
import { authenticateToken } from '../../middlewares/auth';

const router = Router();
const controller = new DeploymentController();

router.use(authenticateToken as any);

router.post('/', controller.create);
router.get('/', controller.listByProject);
router.get('/jobs', controller.listAllJobs);
router.get('/:id', controller.get);
router.post('/:id/pay', controller.pay);
router.post('/:id/action', controller.triggerAction);
router.get('/:id/jobs', controller.getJobs);
router.get('/:id/jobs/:jobId', controller.getJob);

export default router;
export const deploymentRoutes = router;
