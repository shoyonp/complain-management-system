import { Router } from 'express';
import { loadUser } from '../../middleware/loadUser.js';
import { validate } from '../../middleware/validate.js';
import { me, registerProfile } from './auth.controller.js';
import { registerProfileSchema } from './auth.schema.js';

export const createAuthRouter = ({ verifyToken }) => {
  const router = Router();

  // First profile creation: signed in and email-verified, but no MongoDB user yet.
  router.post(
    '/register-profile',
    verifyToken,
    validate({ body: registerProfileSchema }),
    registerProfile,
  );

  // Works for pending/suspended users too, so the client can show the right
  // gate screen (pending approval, rejected, suspended).
  router.get('/me', verifyToken, loadUser, me);

  return router;
};
