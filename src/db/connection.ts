import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { config } from '../config';

let isMongooseConnected = false;

export async function connectDB(): Promise<boolean> {
  if (!config.mongodbUri) {
    logger.warn('[Database] MONGODB_URI environment variable is missing. Running in high-performance In-Memory state mode.');
    isMongooseConnected = false;
    return false;
  }

  try {
    logger.info('[Database] Attempting to connect to MongoDB...');
    
    // Set a short connection timeout so we don't hang startup if MongoDB is unreachable
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });

    isMongooseConnected = true;
    logger.info('[Database] Successfully connected to MongoDB.');
    return true;
  } catch (error: any) {
    logger.warn(`[Database] MongoDB connection failed: ${error.message}. Running in high-performance In-Memory state mode.`);
    isMongooseConnected = false;
    return false;
  }
}

export function getIsMongooseConnected(): boolean {
  return isMongooseConnected;
}

// Utility to switch connection state (e.g. for testing or fallback)
export function setMongooseConnected(status: boolean) {
  isMongooseConnected = status;
}
