# DIU Complaint API

Express 5 (ES modules) backend for the privacy-preserving student complaint management system. **M1 Auth and RBAC** is implemented: Firebase token verification, MongoDB user profiles, role-based authorization, the student-verification queue, and rate limiting.

## Requirements

- Node.js >= 22.12 (uses native `.env` loading via `process.loadEnvFile`)
- npm 10+
- A Firebase project with Email/Password sign-in enabled, plus a service account key
- MongoDB Atlas, or the in-memory dev database (no Atlas account needed)

## Setup

```bash
cd backend
npm install
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
```

Then either:

```bash
npm run dev:memdb   # in-memory MongoDB, data resets on restart
npm run dev         # uses MONGODB_URI from .env
```

The server prints a structured log line and listens on `PORT` (default `5000`). `GET /health` reports `database: "connected"`.

## Scripts

| Script                 | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start with nodemon (needs `MONGODB_URI`) |
| `npm run dev:memdb`    | Start with an in-memory MongoDB          |
| `npm start`            | Start once (used by Render/Railway)      |
| `npm run seed`         | Create/refresh the first administrator   |
| `npm run lint`         | ESLint (flat config)                     |
| `npm run lint:fix`     | ESLint with autofix                      |
| `npm run format`       | Prettier write                           |
| `npm run format:check` | Prettier check                           |
| `npm test`             | Jest + Supertest (ESM via vm modules)    |

`npm test` boots its own in-memory MongoDB and injects a fake token verifier, so no credentials or network access are required.

## Seeding the first admin

```bash
# backend/.env
SEED_ADMIN_EMAIL=you@example.com
SEED_ADMIN_NAME=System Administrator
```

`npm run seed` creates the Firebase account if it does not exist and upserts the matching MongoDB user with role `admin`, status `active` and both admin permissions. When the Firebase user is new, the script logs a one-time password-reset link — use it to set the password. Seeded admins are the only accounts created outside the student signup flow; further admins are created by an admin in a later milestone (§7.2).

## Endpoints

| Method  | Path                             | Access                     |
| ------- | -------------------------------- | -------------------------- |
| `GET`   | `/health`                        | Public                     |
| `POST`  | `/api/v1/auth/register-profile`  | Signed in + email verified |
| `GET`   | `/api/v1/auth/me`                | Signed in + profile exists |
| `PATCH` | `/api/v1/users/me`               | Signed in + active         |
| `GET`   | `/api/v1/admin/users`            | Admin + active             |
| `PATCH` | `/api/v1/admin/users/:id/verify` | Admin + active             |

`GET /api/v1/auth/me` deliberately works for `pending`, `rejected` and `suspended` accounts so the client can render the right gate screen. Business routes use `requireActive`.

List query parameters (`/admin/users`): `role`, `status`, `q` (name, email or student ID), `page`, `limit` (max 100). Unknown parameters are rejected.

## Auth pipeline

```
verifyToken  -> Firebase ID token -> req.auth
loadUser     -> MongoDB user by firebaseUid -> req.user (403 PROFILE_REQUIRED if absent)
authorize    -> role check against req.user.role
requireActive-> status === active (403 ACCOUNT_NOT_ACTIVE)
validate     -> Zod schema for body/query/params
```

Admin routes additionally verify the token with `checkRevoked: true`, so a suspended account loses access immediately.

## Error format

Every failure uses one shape (blueprint §5.3):

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Route GET /x not found." } }
```

Codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `PROFILE_REQUIRED`, `ACCOUNT_NOT_ACTIVE`, `EMAIL_NOT_VERIFIED`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INVALID_TRANSITION`, `INTERNAL_ERROR`. No stack traces in production responses.

## Privacy rules enforced here

- `firebaseUid` and other internals never leave the server (`user.serializer.js`).
- `register-profile` and `PATCH /users/me` use strict Zod objects, so `role`, `status` and `permissions` in a request body are rejected rather than assigned (no mass assignment).
- Admin responses include the student ID because verification requires comparing it with university records; the self serializer does not add admin-only fields.
- Custom `sanitizeRequest` strips MongoDB operator keys (`$ne`), dotted keys and prototype-pollution keys from bodies.

## Environment variables

Validated at startup by `src/config/env.js`; invalid or missing values exit the process with a readable message. Nothing else in the codebase reads `process.env` directly.

| Variable                | Required  | Notes                                                        |
| ----------------------- | --------- | ------------------------------------------------------------ |
| `NODE_ENV`              | No        | `development` (default), `test`, `production`                |
| `PORT`                  | No        | 1-65535, default `5000`                                      |
| `CLIENT_ORIGIN`         | **Yes**   | Exact frontend origin for CORS, e.g. `http://localhost:5173` |
| `MONGODB_URI`           | **Yes**   | Atlas connection string (not needed with `dev:memdb`)        |
| `FIREBASE_PROJECT_ID`   | **Yes**   | Service account project ID                                   |
| `FIREBASE_CLIENT_EMAIL` | **Yes**   | Service account client email                                 |
| `FIREBASE_PRIVATE_KEY`  | **Yes**   | Service account private key (`\n` escapes are converted)     |
| `SEED_ADMIN_EMAIL`      | Seed only | First admin's email                                          |
| `SEED_ADMIN_NAME`       | No        | Defaults to `System Administrator`                           |
| `PSEUDONYM_SECRET`      | M2        | HMAC key for `ownerKey`                                      |
| `IDENTITY_ENC_KEY`      | M2        | Base64 32-byte AES-256-GCM key                               |
| `AI_*`                  | M7        | `AI_ENABLED=false` by default                                |

`.env` is loaded only outside `test`; tests declare their own environment in `tests/setup.js`. Firebase credentials are optional in `test` because the verifier is injected.

## Structure

```
src/
  server.js                # start HTTP, graceful shutdown
  app.js                   # createApp({ verifyIdToken }) factory, middleware pipeline
  config/                  # env, db, firebase (lazy), constants
  middleware/              # verifyToken, loadUser, authorize, validate, sanitize,
                           # rateLimiters, errorHandler, notFound
  modules/
    auth/                  # register-profile, /me
    users/                 # model, serializer, self-update, admin queue
  seed/seed.js             # first administrator
  utils/                   # ApiError, asyncHandler, logger, health, pagination, escapeRegex
scripts/dev-memdb.js       # in-memory MongoDB for local development
tests/                     # Jest + Supertest (integration + unit)
```

Conventions: route -> controller -> service -> model. Controllers never touch Mongoose; success is `{ success: true, data, meta? }`.

## Deviations from the blueprint

- **`express-mongo-sanitize` replaced** by `src/middleware/sanitize.js`: the package does not support Express 5 (it assigns to the read-only `req.query` getter).
- **`loadUser` and `requireActive` are separate**: `GET /auth/me` must stay readable for pending/rejected/suspended users, so the account-state gate is applied per route.
- **Extra error codes** beyond the blueprint list: `PROFILE_REQUIRED`, `ACCOUNT_NOT_ACTIVE`, `EMAIL_NOT_VERIFIED` — the client needs to tell onboarding states apart.
- **Firebase Admin is imported dynamically** because its `jose` dependency is ESM-only and breaks Jest when tests inject a fake verifier.

## Not in this milestone

Departments, categories, complaints, identity vault, audit logs, analytics, AI provider calls. See `docs/BLUEPRINT.md` §13.
