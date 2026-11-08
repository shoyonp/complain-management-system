import { readFileSync } from 'node:fs';
import { env } from '../config/env.js';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

// Kept in its own module so later milestones can add readiness fields
// (database, Firebase) without touching the route.
export const buildHealthPayload = () => ({
  status: 'ok',
  uptime: Number(process.uptime().toFixed(2)),
  timestamp: new Date().toISOString(),
  version: pkg.version,
  environment: env.NODE_ENV,
});
