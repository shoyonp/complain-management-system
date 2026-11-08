import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { verifyFirebaseIdToken } from './config/firebase.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { authLimiter, globalLimiter } from './middleware/rateLimiters.js';
import { sanitizeRequest } from './middleware/sanitize.js';
import { createVerifyToken } from './middleware/verifyToken.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAdminUsersRouter, createUsersRouter } from './modules/users/users.routes.js';
import { buildHealthPayload } from './utils/health.js';

// Dependency injection for the token verifier keeps tests free of Firebase
// credentials (blueprint §14.1).
export const createApp = ({ verifyIdToken = verifyFirebaseIdToken } = {}) => {
  const app = express();

  // Render/Railway terminate TLS in front of the API; needed for correct
  // client IPs in rate limiting.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Request pipeline per blueprint §5.2.
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(globalLimiter);
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeRequest);

  const verifyToken = createVerifyToken(verifyIdToken);
  const verifyTokenStrict = createVerifyToken(verifyIdToken, { checkRevoked: true });

  // Public health check for the hosting platform and uptime monitoring (§14.4).
  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: buildHealthPayload() });
  });

  app.use('/api/v1/auth', authLimiter, createAuthRouter({ verifyToken }));
  app.use('/api/v1/users', createUsersRouter({ verifyToken }));
  app.use('/api/v1/admin/users', createAdminUsersRouter({ verifyToken: verifyTokenStrict }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
