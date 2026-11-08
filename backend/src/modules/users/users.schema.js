import { z } from 'zod';
import { ROLES, USER_STATUS, VERIFICATION_DECISIONS } from '../../config/constants.js';

const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{6,30}$/, { error: 'Phone number format is invalid' });

// Self-service profile edit: only these two fields are accepted, so `role`,
// `status` and `permissions` in the body are rejected as unknown keys.
export const updateMeSchema = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(2, { error: 'Name must be at least 2 characters' })
      .max(120)
      .optional(),
    phone: phone.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Provide at least one field to update.',
  });

export const adminListQuerySchema = z.strictObject({
  role: z.enum(Object.values(ROLES)).optional(),
  status: z.enum(Object.values(USER_STATUS)).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const userIdParamsSchema = z.strictObject({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, { error: 'Invalid user id' }),
});

export const verifyUserSchema = z.strictObject({
  decision: z.enum(Object.values(VERIFICATION_DECISIONS), {
    error: 'Decision must be approve or reject',
  }),
  note: z.string().trim().max(500, { error: 'Note must be at most 500 characters' }).optional(),
});
