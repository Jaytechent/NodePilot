import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRepository } from '../modules/users/user.repository';
import { UserRole } from '../types';

const userRepo = new UserRepository();

export interface IAuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    walletAddress?: string;
    role: UserRole;
  };
}

/**
 * Authenticates JWT bearer token
 */
export async function authenticateToken(
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Access token is missing. Please provide Bearer <token>.'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    const user = await userRepo.findById(decoded.id);
    if (!user) {
      return next(new UnauthorizedError('Authenticated user does not exist.'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
      role: user.role,
    };
    
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token has expired. Use refresh endpoint.'));
    }
    return next(new UnauthorizedError('Invalid access token.'));
  }
}

/**
 * Enforces Role-Based Access Control
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication is required to access this resource.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access Forbidden. Your role '${req.user.role}' is insufficient. Required: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}
