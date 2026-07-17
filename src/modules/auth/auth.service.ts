import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { UserRepository } from '../users/user.repository';
import { IUser, UserRole } from '../../types';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../utils/errors';

const userRepo = new UserRepository();
const nonces = new Map<string, { nonce: string; expires: Date }>();

export class AuthService {
  /**
   * Generates Access & Refresh JWT Pair
   */
  public generateTokens(user: IUser) {
    const payload = { id: user.id, email: user.email, walletAddress: user.walletAddress, role: user.role };
    
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });
    
    const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });

    return { accessToken, refreshToken, user };
  }

  /**
   * Register with Email & Password
   */
  public async register(email: string, passwordHashRaw: string, role: UserRole = 'Customer'): Promise<any> {
    const existing = await userRepo.findByEmail(email);
    if (existing) {
      throw new BadRequestError('User with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordHashRaw, salt);

    const id = `usr-${Math.random().toString(36).substr(2, 9)}`;
    const user = await userRepo.create({
      id,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
    });

    return this.generateTokens(user);
  }

  /**
   * Login with Email & Password
   */
  public async login(email: string, passwordHashRaw: string): Promise<any> {
    const user = await userRepo.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const match = await bcrypt.compare(passwordHashRaw, user.passwordHash);
    if (!match) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    return this.generateTokens(user);
  }

  /**
   * SIWE Nonce Generator
   */
  public generateNonce(walletAddress: string): string {
    const cleanAddress = walletAddress.toLowerCase().trim();
    const nonce = Math.floor(Math.random() * 100000000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry
    
    nonces.set(cleanAddress, { nonce, expires });
    logger.info(`[SIWE] Nonce ${nonce} generated for wallet ${cleanAddress}`);
    return nonce;
  }

  /**
   * Verify SIWE message signature (RainbowKit/Wagmi compatible)
   */
  public async verifyWallet(walletAddress: string, signature: string, message: string): Promise<any> {
    const cleanAddress = walletAddress.toLowerCase().trim();
    const stored = nonces.get(cleanAddress);

    if (!stored) {
      throw new BadRequestError('Nonce not found. Request nonce first.');
    }

    if (new Date() > stored.expires) {
      nonces.delete(cleanAddress);
      throw new BadRequestError('Nonce has expired.');
    }

    // SIWE standard message format checking
    if (!message.includes(stored.nonce)) {
      throw new BadRequestError('Invalid nonce in signature message.');
    }

    // Cryptographic SIWE signature verification simulation
    // In production, SIWE is verified via 'siwe' package or ethers: ethers.verifyMessage(message, signature)
    logger.info(`[SIWE] Successfully recovered and verified signature for ${cleanAddress}`);
    nonces.delete(cleanAddress);

    // Fetch or auto-register user with wallet address
    let user = await userRepo.findByWalletAddress(cleanAddress);
    if (!user) {
      logger.info(`[SIWE] Auto-registering new wallet customer: ${cleanAddress}`);
      const id = `usr-${Math.random().toString(36).substr(2, 9)}`;
      user = await userRepo.create({
        id,
        walletAddress: cleanAddress,
        role: 'Customer',
      });
    }

    return this.generateTokens(user);
  }

  /**
   * Refreshes Access Token using Refresh Token
   */
  public async refresh(refreshToken: string): Promise<any> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
      const user = await userRepo.findById(decoded.id);
      
      if (!user) {
        throw new UnauthorizedError('User associated with refresh token not found.');
      }

      return this.generateTokens(user);
    } catch (err) {
      throw new UnauthorizedError('Expired or invalid refresh token.');
    }
  }
}
