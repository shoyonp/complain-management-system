import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { PERMISSIONS, ROLES, USER_STATUS, VERIFICATION_DECISIONS } from '../../config/constants.js';

// Document shapes replace the Mongoose schema: every write is validated here
// before insertOne/updateOne (§6 driver note). Fields match §6.2 exactly.
const objectIdField = z.instanceof(ObjectId);

const studentProfileDocument = z.strictObject({
  studentId: z.string().min(1).max(30),
  academicDepartment: z.string().max(120).optional(),
  batch: z.string().max(40).optional(),
  semester: z.string().max(40).optional(),
});

export const userDocumentSchema = z.strictObject({
  _id: objectIdField.optional(),
  firebaseUid: z.string().min(1),
  email: z.string().min(1),
  name: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
  role: z.enum(Object.values(ROLES)),
  status: z.enum(Object.values(USER_STATUS)),
  studentProfile: studentProfileDocument.optional(),
  departmentRef: objectIdField.nullable().optional(),
  permissions: z.array(z.enum(Object.values(PERMISSIONS))),
  verifiedBy: objectIdField.nullable().optional(),
  verifiedAt: z.date().nullable().optional(),
  verificationNote: z.string().max(500).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const userUpdateSchema = userDocumentSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: 'An update must change at least one field.',
  });

export const assertUserDocument = (document) => userDocumentSchema.parse(document);
export const assertUserUpdate = (update) => userUpdateSchema.parse(update);

// --- Request schemas ---

const phoneField = z
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
    phone: phoneField.optional(),
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
