import { z } from 'zod';

// Load `.env` for local development only. Production hosts (Render/Railway)
// inject environment variables directly, so a missing file is not an error.
if (process.env.NODE_ENV !== 'test') {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: fall back to variables provided by the shell or host.
  }
}

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

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';
