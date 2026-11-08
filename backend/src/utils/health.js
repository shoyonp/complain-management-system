import { dbState } from '../config/db.js';
import { env } from '../config/env.js';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

// Kept in its own module so later milestones can add readiness fields
// (Firebase, AI provider) without touching the route.
export const buildHealthPayload = () => ({
  status: 'ok',
  uptime: Number(process.uptime().toFixed(2)),
  timestamp: new Date().toISOString(),
  version: pkg.version,
  environment: env.NODE_ENV,
  database: dbState(),
});
