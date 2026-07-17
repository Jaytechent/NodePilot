import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ZodError, z } from 'zod';
import { BadRequestError } from '../../utils/errors';

const authService = new AuthService();

// Input Validation Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['Admin', 'Operator', 'Customer', 'Support']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const walletNonceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address layout'),
});

const walletVerifySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address layout'),
  signature: z.string().min(1),
  message: z.string().min(1),
});

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(validated.email, validated.password, validated.role);
      res.status(211).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new BadRequestError(err.issues[0].message));
      }
      next(err);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated.email, validated.password);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new BadRequestError(err.issues[0].message));
      }
      next(err);
    }
  }

  public async getWalletNonce(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = walletNonceSchema.parse(req.body);
      const nonce = authService.generateNonce(validated.address);
      res.status(200).json({ success: true, data: { nonce } });
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new BadRequestError(err.issues[0].message));
      }
      next(err);
    }
  }

  public async verifyWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = walletVerifySchema.parse(req.body);
      const result = await authService.verifyWallet(validated.address, validated.signature, validated.message);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new BadRequestError(err.issues[0].message));
      }
      next(err);
    }
  }

  public async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new BadRequestError('Refresh token is required.');
      }
      const result = await authService.refresh(refreshToken);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getMe(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: { user: req.user } });
    } catch (err) {
      next(err);
    }
  }
}
