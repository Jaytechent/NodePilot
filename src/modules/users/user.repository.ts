import { IUser } from '../../types';
import { UserModel } from './user.model';
import { getIsMongooseConnected } from '../../db/connection';
import { logger } from '../../utils/logger';

// In-Memory store fallback
const inMemoryUsers = new Map<string, IUser>();

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    if (getIsMongooseConnected()) {
      try {
        const user = await UserModel.findById(id).exec();
        return user ? (user.toJSON() as IUser) : null;
      } catch (err: any) {
        logger.error(`UserRepository findById error: ${err.message}`);
      }
    }
    return inMemoryUsers.get(id) || null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (getIsMongooseConnected()) {
      try {
        const user = await UserModel.findOne({ email: cleanEmail }).exec();
        return user ? (user.toJSON() as IUser) : null;
      } catch (err: any) {
        logger.error(`UserRepository findByEmail error: ${err.message}`);
      }
    }
    for (const user of inMemoryUsers.values()) {
      if (user.email?.toLowerCase() === cleanEmail) {
        return user;
      }
    }
    return null;
  }

  async findByWalletAddress(walletAddress: string): Promise<IUser | null> {
    const cleanAddress = walletAddress.toLowerCase().trim();
    if (getIsMongooseConnected()) {
      try {
        const user = await UserModel.findOne({ walletAddress: cleanAddress }).exec();
        return user ? (user.toJSON() as IUser) : null;
      } catch (err: any) {
        logger.error(`UserRepository findByWalletAddress error: ${err.message}`);
      }
    }
    for (const user of inMemoryUsers.values()) {
      if (user.walletAddress?.toLowerCase() === cleanAddress) {
        return user;
      }
    }
    return null;
  }

  async create(user: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'> & { id: string }): Promise<IUser> {
    const now = new Date();
    const newUser: IUser = {
      balance: 500.0, // default credits
      ...user,
      createdAt: now,
      updatedAt: now,
    };

    if (getIsMongooseConnected()) {
      try {
        const userDoc = new UserModel({
          _id: newUser.id,
          email: newUser.email,
          passwordHash: newUser.passwordHash,
          walletAddress: newUser.walletAddress,
          role: newUser.role,
          balance: newUser.balance,
        });
        await userDoc.save();
        return userDoc.toJSON() as IUser;
      } catch (err: any) {
        logger.error(`UserRepository create error: ${err.message}. Saving to memory.`);
      }
    }

    inMemoryUsers.set(newUser.id, newUser);
    return newUser;
  }

  async update(id: string, updates: Partial<Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>>): Promise<IUser | null> {
    if (getIsMongooseConnected()) {
      try {
        const user = await UserModel.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true }
        ).exec();
        return user ? (user.toJSON() as IUser) : null;
      } catch (err: any) {
        logger.error(`UserRepository update error: ${err.message}`);
      }
    }

    const user = inMemoryUsers.get(id);
    if (!user) return null;

    const updatedUser: IUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryUsers.set(id, updatedUser);
    return updatedUser;
  }

  async list(): Promise<IUser[]> {
    if (getIsMongooseConnected()) {
      try {
        const users = await UserModel.find().exec();
        return users.map((u) => u.toJSON() as IUser);
      } catch (err: any) {
        logger.error(`UserRepository list error: ${err.message}`);
      }
    }
    return Array.from(inMemoryUsers.values());
  }

  async delete(id: string): Promise<boolean> {
    if (getIsMongooseConnected()) {
      try {
        const res = await UserModel.deleteOne({ _id: id }).exec();
        return (res.deletedCount ?? 0) > 0;
      } catch (err: any) {
        logger.error(`UserRepository delete error: ${err.message}`);
      }
    }
    return inMemoryUsers.delete(id);
  }
}
