import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { env } from './env.js';

export const connectDb = async (uri = env.MONGODB_URI) => {
  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });

  logger.info('MongoDB connected', {
    host: mongoose.connection.host,
    database: mongoose.connection.name,
  });
};

export const disconnectDb = async () => {
  await mongoose.disconnect();
};

export const dbState = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');
