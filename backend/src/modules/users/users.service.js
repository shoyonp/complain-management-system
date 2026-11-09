import { ObjectId } from 'mongodb';
import { collection } from '../../config/db.js';
import { ROLES, USER_STATUS, VERIFICATION_DECISIONS } from '../../config/constants.js';
import { ApiError } from '../../utils/ApiError.js';
import { escapeRegex } from '../../utils/escapeRegex.js';
import { buildPaginationMeta } from '../../utils/pagination.js';
import { assertUserUpdate } from './users.schema.js';

export const updateOwnProfile = async (user, payload) => {
  const changes = {};

  if (payload.name !== undefined) {
    changes.name = payload.name;
  }
  if (payload.phone !== undefined) {
    changes.phone = payload.phone;
  }
  // Timestamps are set by hand now (blueprint §6 driver note).
  changes.updatedAt = new Date();

  assertUserUpdate(changes);

  return collection('users').findOneAndUpdate(
    { _id: user._id },
    { $set: changes },
    { returnDocument: 'after' },
  );
};

export const listUsers = async ({ role, status, q, page, limit }) => {
  const filter = {};

  if (role) {
    filter.role = role;
  }
  if (status) {
    filter.status = status;
  }
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { 'studentProfile.studentId': pattern }];
  }

  const [items, total] = await Promise.all([
    collection('users')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection('users').countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta({ page, limit, total }) };
};

export const verifyUser = async ({ actor, targetId, decision, note }) => {
  if (!ObjectId.isValid(targetId)) {
    throw ApiError.badRequest('Invalid identifier format.');
  }

  const target = await collection('users').findOne({ _id: new ObjectId(targetId) });

  if (!target) {
    throw ApiError.notFound('User not found.');
  }

  if (target.role !== ROLES.STUDENT) {
    throw ApiError.conflict('Only student accounts can be verified.');
  }

  if (target.status !== USER_STATUS.PENDING) {
    throw ApiError.conflict('Only pending accounts can be verified.');
  }

  const now = new Date();
  const changes = {
    status: decision === VERIFICATION_DECISIONS.APPROVE ? USER_STATUS.ACTIVE : USER_STATUS.REJECTED,
    verifiedBy: actor._id,
    verifiedAt: now,
    updatedAt: now,
  };

  if (note !== undefined) {
    changes.verificationNote = note;
  }

  assertUserUpdate(changes);

  return collection('users').findOneAndUpdate(
    { _id: target._id },
    { $set: changes },
    { returnDocument: 'after' },
  );
};
