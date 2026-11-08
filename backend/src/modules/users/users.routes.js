import { Router } from 'express';
import { ROLES } from '../../config/constants.js';
import { authorize } from '../../middleware/authorize.js';
import { loadUser, requireActive } from '../../middleware/loadUser.js';
import { validate } from '../../middleware/validate.js';
import { list, updateMe, verify } from './users.controller.js';
import {
  adminListQuerySchema,
  updateMeSchema,
  userIdParamsSchema,
  verifyUserSchema,
} from './users.schema.js';

// /api/v1/users — signed-in user's own resources.
export const createUsersRouter = ({ verifyToken }) => {
  const router = Router();

  router.patch(
    '/me',
    verifyToken,
    loadUser,
    requireActive,
    validate({ body: updateMeSchema }),
    updateMe,
  );

  return router;
};

// /api/v1/admin/users — admin-only user management. Token revocation is checked
// because these routes can change account state (blueprint §7.3).
export const createAdminUsersRouter = ({ verifyToken }) => {
  const router = Router();

  router.use(verifyToken, loadUser, authorize(ROLES.ADMIN), requireActive);

  router.get('/', validate({ query: adminListQuerySchema }), list);
  router.patch(
    '/:id/verify',
    validate({ params: userIdParamsSchema, body: verifyUserSchema }),
    verify,
  );

  return router;
};
