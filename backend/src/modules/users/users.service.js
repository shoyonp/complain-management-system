import { ROLES, USER_STATUS, VERIFICATION_DECISIONS } from '../../config/constants.js';
import { ApiError } from '../../utils/ApiError.js';
import { escapeRegex } from '../../utils/escapeRegex.js';
import { buildPaginationMeta } from '../../utils/pagination.js';
import { User } from './user.model.js';

export const updateOwnProfile = async (user, payload) => {
  if (payload.name !== undefined) {
    user.name = payload.name;
  }
  if (payload.phone !== undefined) {
    user.phone = payload.phone;
  }

  await user.save();
  return user;
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
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta({ page, limit, total }) };
};

export const verifyUser = async ({ actor, targetId, decision, note }) => {
  const target = await User.findById(targetId);

  if (!target) {
    throw ApiError.notFound('User not found.');
  }

  if (target.role !== ROLES.STUDENT) {
    throw ApiError.conflict('Only student accounts can be verified.');
  }

  if (target.status !== USER_STATUS.PENDING) {
    throw ApiError.conflict('Only pending accounts can be verified.');
  }

  target.status =
    decision === VERIFICATION_DECISIONS.APPROVE ? USER_STATUS.ACTIVE : USER_STATUS.REJECTED;
  target.verifiedBy = actor._id;
  target.verifiedAt = new Date();

  if (note !== undefined) {
    target.verificationNote = note;
  }

  await target.save();
  return target;
};
