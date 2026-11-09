import { randomBytes } from 'node:crypto';
import { PERMISSIONS, ROLES, USER_STATUS } from '../config/constants.js';
import { collection, connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { getFirebaseAuth } from '../config/firebase.js';
import { ensureIndexes } from '../config/indexes.js';
import { logger } from '../utils/logger.js';
import { assertUserUpdate } from '../modules/users/users.schema.js';

const seedFirstAdmin = async () => {
  if (!env.SEED_ADMIN_EMAIL) {
    throw new Error('SEED_ADMIN_EMAIL is required to seed the first admin.');
  }

  const name = env.SEED_ADMIN_NAME ?? 'System Administrator';
  const auth = await getFirebaseAuth();

  let firebaseUser;
  try {
    firebaseUser = await auth.getUserByEmail(env.SEED_ADMIN_EMAIL);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }

    firebaseUser = await auth.createUser({
      email: env.SEED_ADMIN_EMAIL,
      emailVerified: true,
      displayName: name,
      password: randomBytes(24).toString('base64url'),
    });

    const resetLink = await auth.generatePasswordResetLink(env.SEED_ADMIN_EMAIL);
    logger.info('Created Firebase admin user. Set its password with this one-time link.', {
      email: env.SEED_ADMIN_EMAIL,
      resetLink,
    });
  }

  const now = new Date();
  const changes = {
    email: env.SEED_ADMIN_EMAIL,
    name,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    permissions: [PERMISSIONS.REVEAL_IDENTITY, PERMISSIONS.MANAGE_USERS],
    updatedAt: now,
  };

  assertUserUpdate(changes);

  const admin = await collection('users').findOneAndUpdate(
    { firebaseUid: firebaseUser.uid },
    {
      $set: changes,
      // The upsert filter already supplies firebaseUid.
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );

  logger.info('First admin ready', { id: admin._id.toString(), email: admin.email });
};

const runSeed = async () => {
  await connectDb();
  await ensureIndexes();

  try {
    await seedFirstAdmin();
  } finally {
    await disconnectDb();
  }
};

runSeed().catch((error) => {
  logger.error('Seed failed', { error: error.message });
  process.exit(1);
});
