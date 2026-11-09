import { logger } from './utils/logger.js';
// Side effect: load `.env` before `--memdb` sets an in-memory URI and before
// config/env.js validates the environment.
import './config/loadEnv.js';

// `--memdb` boots a throwaway MongoDB before env validation so MONGODB_URI is
// present. mongodb-memory-server is a devDependency and is imported lazily, so
// production never loads it.
let memdbServer;
if (process.argv.includes('--memdb')) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memdbServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memdbServer.getUri();
  console.log(`[dev] In-memory MongoDB listening at ${process.env.MONGODB_URI}`);
}

// Imported after the in-memory URI exists: config/env.js validates at import.
const { env, isTest } = await import('./config/env.js');
const { connectDb, disconnectDb } = await import('./config/db.js');
const { ensureIndexes } = await import('./config/indexes.js');
const { app } = await import('./app.js');

const stopMemdb = async () => {
  await memdbServer?.stop();
};

const start = async () => {
  await connectDb();
  await ensureIndexes();

  const server = app.listen(env.PORT, () => {
    logger.info('API listening', { port: env.PORT, environment: env.NODE_ENV });
  });

  const shutdown = (signal) => {
    logger.info('Shutting down', { signal });

    server.close(async () => {
      await disconnectDb();
      await stopMemdb();
      process.exit(0);
    });

    // Do not hang forever if a connection refuses to close.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      error: reason instanceof Error ? reason.message : String(reason),
    });
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message });
    shutdown('uncaughtException');
  });
};

// Tests import src/app.js directly and must never open a port or connect here.
if (!isTest) {
  start().catch((error) => {
    logger.error('Failed to start API', { error: error.message });
    process.exit(1);
  });
}
