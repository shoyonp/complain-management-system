import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { buildHealthPayload } from './utils/health.js';

export const app = express();

app.disable('x-powered-by');

// Request pipeline per blueprint §5.2. Rate limiting and express-mongo-sanitize
// arrive in M1 with the first real routes; /health stays exempt so uptime
// pingers are never throttled.
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '100kb' }));

// Public health check for the hosting platform and uptime monitoring (§14.4).
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: buildHealthPayload() });
});

app.use(notFound);
app.use(errorHandler);

export default app;
