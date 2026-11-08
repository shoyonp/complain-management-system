import { randomBytes } from 'node:crypto';
import { PERMISSIONS, ROLES, USER_STATUS } from '../config/constants.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { getFirebaseAuth } from '../config/firebase.js';
import { User } from '../modules/users/user.model.js';
import { logger } from '../utils/logger.js';

// Creates (or updates) the first admin: a Firebase account you control plus the
// matching MongoDB user. Additional admins are created by an admin later (§7.2).
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

  const admin = await User.findOneAndUpdate(
    { firebaseUid: firebaseUser.uid },
    {
      $set: {
        email: env.SEED_ADMIN_EMAIL,
        name,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        permissions: [PERMISSIONS.REVEAL_IDENTITY, PERMISSIONS.MANAGE_USERS],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  logger.info('First admin ready', { id: admin._id.toString(), email: admin.email });
};

const main = async () => {
  await connectDb();
  try {
    await seedFirstAdmin();
  } finally {
    await disconnectDb();
  }
};

main().catch((error) => {
  logger.error('Seed failed', { error: error.message });
  process.exit(1);
});
