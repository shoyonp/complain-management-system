# DIU Complaint API

Express 5 (ES modules) backend for the privacy-preserving student complaint management system. This is the **M0 Foundation** skeleton: environment validation, the shared error envelope, and `GET /health`. Business modules arrive in later milestones.

## Requirements

- Node.js >= 22.12 (uses native `.env` loading via `process.loadEnvFile`)
- npm 10+

## Setup

```bash
cd backend
npm install
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

The server prints a structured log line and listens on `PORT` (default `5000`).

## Scripts

| Script                 | Purpose                               |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start with nodemon (reload on change) |
| `npm start`            | Start once (used by Render/Railway)   |
| `npm run lint`         | ESLint (flat config)                  |
| `npm run lint:fix`     | ESLint with autofix                   |
| `npm run format`       | Prettier write                        |
| `npm run format:check` | Prettier check                        |
| `npm test`             | Jest + Supertest (ESM via vm modules) |

## Health check

```http
GET /health
```

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 12.34,
    "timestamp": "2026-11-09T10:00:00.000Z",
    "version": "0.1.0",
    "environment": "development"
  }
}
```

Public and unauthenticated. Hosting platforms use it as the deploy health check, so it must stay exempt from rate limiting (M1). A `db` readiness field is added in M2 when the database connects.

## Error format

Every failure uses one shape (blueprint §5.3):

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Route GET /x not found." } }
```

Codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INVALID_TRANSITION`, `INTERNAL_ERROR`. No stack traces in production responses.

## Environment variables

Validated at startup by `src/config/env.js`; invalid or missing values exit the process with a readable message. Nothing else in the codebase reads `process.env` directly.

| Variable           | Required | Notes                                                        |
| ------------------ | -------- | ------------------------------------------------------------ |
| `NODE_ENV`         | No       | `development` (default), `test`, `production`                |
| `PORT`             | No       | 1-65535, default `5000`                                      |
| `CLIENT_ORIGIN`    | **Yes**  | Exact frontend origin for CORS, e.g. `http://localhost:5173` |
| `MONGODB_URI`      | M2       | Atlas connection string                                      |
| `FIREBASE_*`       | M1       | `PROJECT_ID`, `CLIENT_EMAIL`, `PRIVATE_KEY`                  |
| `PSEUDONYM_SECRET` | M2       | HMAC key for `ownerKey`                                      |
| `IDENTITY_ENC_KEY` | M2       | Base64 32-byte AES-256-GCM key                               |
| `AI_*`             | M7       | `AI_ENABLED=false` by default                                |

`.env` is loaded only outside `test`; tests declare their own environment in `tests/setup.js`.

## Structure

```
src/
  server.js              # start HTTP, graceful shutdown
  app.js                 # middleware pipeline, /health, 404, error handler
  config/env.js          # Zod validation, fail fast
  middleware/            # errorHandler, notFound
  utils/                 # ApiError, asyncHandler, logger, health
tests/                   # Jest + Supertest
```

Conventions: route -> controller -> service -> model (from M1); controllers never touch Mongoose; success is `{ success: true, data, meta? }`.

## Not in this milestone

Rate limiting, `express-mongo-sanitize`, Firebase token verification, database models, seed data. See `docs/BLUEPRINT.md` §13.
