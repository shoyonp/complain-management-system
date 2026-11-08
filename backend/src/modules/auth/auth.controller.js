import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeSelf } from '../users/user.serializer.js';
import { registerStudentProfile } from './auth.service.js';

export const registerProfile = asyncHandler(async (req, res) => {
  const user = await registerStudentProfile({ auth: req.auth, payload: req.body });

  res.status(201).json({ success: true, data: serializeSelf(user) });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: serializeSelf(req.user) });
});
