import { collection } from './db.js';

// Safe to run on every boot: createIndex is idempotent. Index names are left to
// the driver so they match the ones created previously (no duplicates on an
// existing Atlas database).
export const ensureIndexes = async () => {
  const users = collection('users');

  await users.createIndex({ firebaseUid: 1 }, { unique: true });
  // Not in §6.2's index list, but registration returns 409 on a duplicate
  // email, so the unique constraint is part of the current behavior.
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ role: 1, status: 1 });
  // Sparse: officers and admins have no studentProfile at all.
  await users.createIndex({ 'studentProfile.studentId': 1 }, { unique: true, sparse: true });
};
