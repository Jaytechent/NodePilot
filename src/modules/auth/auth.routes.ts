import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateToken } from '../../middlewares/auth';

const router = Router();
const controller = new AuthController();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/wallet/nonce', controller.getWalletNonce);
router.post('/wallet/verify', controller.verifyWallet);
router.post('/refresh', controller.refreshToken);
router.get('/me', authenticateToken as any, controller.getMe as any);

export default router;
export const authRoutes = router;
