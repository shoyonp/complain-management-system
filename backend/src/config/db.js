import { MongoClient } from 'mongodb';
import { logger } from '../utils/logger.js';
import { env } from './env.js';

// Native MongoDB driver (blueprint §6). One client per process; `db` is the
// database named in MONGODB_URI (or `test` when the URI omits it).
let client;
let db;
let dbConnected = false;

// Handles are resolved lazily, so importing this module never requires a live
// connection — tests connect in beforeAll.
export const getDb = () => {
  if (!db) {
    throw new Error('MongoDB is not connected. Call connectDb() first.');
  }

  return db;
};

// Services read collections through this helper instead of keeping model files
// (blueprint §5.1: native driver, no Mongoose).
export const collection = (name) => getDb().collection(name);

export const connectDb = async (uri = env.MONGODB_URI) => {
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10_000,
  });

  await client.connect();
  db = client.db();
  dbConnected = true;

  logger.info('MongoDB connected', {
    host: client.options.hosts?.[0]?.host ?? 'unknown',
    database: db.databaseName,
  });
};

export const disconnectDb = async () => {
  await client?.close();
  client = null;
  db = null;
  dbConnected = false;
};

// Synchronous so /health can report readiness without awaiting a ping.
export const dbState = () => (dbConnected ? 'connected' : 'disconnected');
