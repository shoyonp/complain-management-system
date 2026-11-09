import { z } from 'zod';
import './loadEnv.js';

const testing = process.env.NODE_ENV === 'test';

// In tests the token verifier and database are injected, so provider
// credentials are not required. Everything else must be present at startup.
const required = (schema) => (testing ? schema.optional() : schema);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce
    .number({ error: 'PORT must be a number' })
    .int({ error: 'PORT must be an integer' })
    .min(1, { error: 'PORT must be between 1 and 65535' })
    .max(65535, { error: 'PORT must be between 1 and 65535' })
    .default(5000),
  CLIENT_ORIGIN: z.url({
    protocol: /^https?$/,
    error: 'CLIENT_ORIGIN must be a valid http(s) URL, e.g. http://localhost:5173',
  }),

  // Database (M1)
  MONGODB_URI: required(
    z
      .string()
      .min(1, { error: 'MONGODB_URI is required' })
      .refine((value) => /^mongodb(\+srv)?:\/\//.test(value), {
        error: 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
      }),
  ),

  // Firebase Admin (M1). The private key may arrive with escaped newlines.
  FIREBASE_PROJECT_ID: required(z.string().min(1, { error: 'FIREBASE_PROJECT_ID is required' })),
  FIREBASE_CLIENT_EMAIL: required(
    z.string().min(1, { error: 'FIREBASE_CLIENT_EMAIL is required' }),
  ),
  FIREBASE_PRIVATE_KEY: required(
    z
      .string()
      .min(1, { error: 'FIREBASE_PRIVATE_KEY is required' })
      .transform((value) => value.replace(/\\n/g, '\n')),
  ),

  // Seed only (used by `npm run seed`, never at runtime)
  SEED_ADMIN_EMAIL: z.email({ error: 'SEED_ADMIN_EMAIL must be a valid email' }).optional(),
  SEED_ADMIN_NAME: z.string().trim().min(1).max(120).optional(),

  // AI integration layer (M7). Off by default; see blueprint §12.
  AI_ENABLED: z.stringbool().default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  // Configuration errors must be readable in plain text, before the logger exists.
  console.error(
    `\n[env] Invalid environment configuration:\n${problems}\n\n` +
      'See backend/.env.example for the required variables.\n',
  );
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

export const isTest = env.NODE_ENV === 'test';
