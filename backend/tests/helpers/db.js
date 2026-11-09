import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../index.js';

let mongod;

export const startTestDb = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Build indexes (unique firebaseUid/email, sparse studentId) before specs run.
  await User.syncIndexes();
};

export const stopTestDb = async () => {
  await mongoose.disconnect();
  await mongod?.stop();
  mongod = undefined;
};

export const clearTestDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};
