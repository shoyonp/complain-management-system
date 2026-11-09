import { z } from 'zod';

const trimmed = (min, max, label) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, { error: `${label} must be at least ${min} characters` })
    .max(max, { error: `${label} must be at most ${max} characters` });

// Profile creation for a signed-in, email-verified student. `role` and `status`
// are deliberately absent: the server assigns them (no mass assignment, §8.2).
export const registerProfileSchema = z.strictObject({
  name: trimmed(2, 120, 'Name'),
  studentId: z
    .string({ error: 'Student ID is required' })
    .trim()
    .min(3, { error: 'Student ID must be at least 3 characters' })
    .max(30, { error: 'Student ID must be at most 30 characters' })
    .regex(/^[A-Za-z0-9-]+$/, {
      error: 'Student ID may only contain letters, numbers and dashes',
    }),
  academicDepartment: trimmed(2, 120, 'Academic department'),
  batch: trimmed(1, 40, 'Batch'),
  semester: trimmed(1, 40, 'Semester'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,30}$/, { error: 'Phone number format is invalid' })
    .optional(),
});
