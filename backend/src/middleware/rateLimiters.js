import { rateLimit } from 'express-rate-limit';
import { isTest } from '../config/env.js';

const envelope = (message) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
});

const skipInTest = () => isTest;

// Global ceiling for the whole API (§8.2). Stricter limiters sit on auth routes
// now and will sit on complaint submission and identity reveal later.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, res) => {
    res.status(429).json(envelope('Too many requests. Please try again later.'));
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, res) => {
    res.status(429).json(envelope('Too many attempts. Please wait before trying again.'));
  },
});
