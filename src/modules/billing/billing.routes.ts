import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authenticateToken } from '../../middlewares/auth';

const router = Router();
const controller = new BillingController();

router.use(authenticateToken as any);

router.get('/balance', controller.getBalance);
router.get('/invoices', controller.getInvoices);
router.post('/deposit', controller.deposit);

export default router;
export const billingRoutes = router;
