import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb, getDb } from '../../src/config/db.js';
import { ensureIndexes } from '../../src/config/indexes.js';

// Absolute cache path: the default is resolved against process.cwd(), which
// breaks when tests are run from the repo root (`npm --prefix backend test`).
const downloadDir = fileURLToPath(
  new URL('../../node_modules/.cache/mongodb-memory-server', import.meta.url),
);

let mongod;

export const startTestDb = async () => {
  mongod = await MongoMemoryServer.create({ binary: { downloadDir } });
  await connectDb(mongod.getUri());
  // Build indexes (unique firebaseUid/email, sparse studentId) before specs run.
  await ensureIndexes();
};

export const stopTestDb = async () => {
  await disconnectDb();
  await mongod?.stop();
  mongod = undefined;
};

export const clearTestDb = async () => {
  const collections = await getDb().collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};
