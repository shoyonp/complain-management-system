import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeAdminUser, serializeSelf } from './user.serializer.js';
import { listUsers, updateOwnProfile, verifyUser } from './users.service.js';

export const updateMe = asyncHandler(async (req, res) => {
  const user = await updateOwnProfile(req.user, req.body);

  res.status(200).json({ success: true, data: serializeSelf(user) });
});

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await listUsers(req.validatedQuery);

  res.status(200).json({ success: true, data: items.map(serializeAdminUser), meta });
});

export const verify = asyncHandler(async (req, res) => {
  const user = await verifyUser({
    actor: req.user,
    targetId: req.params.id,
    ...req.body,
  });

  res.status(200).json({ success: true, data: serializeAdminUser(user) });
});
