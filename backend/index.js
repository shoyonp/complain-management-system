// =============================================================================
// DIU Student Complaint Management System — API
//
// The entire backend lives in this file (blueprint §5.1). Sections follow the
// fixed order defined there, so later milestones add code to the matching
// section instead of creating new folders.
//
//   node index.js             start the API
//   node index.js --seed      create/refresh the first administrator
//   node index.js --memdb     run against a throwaway in-memory MongoDB
// =============================================================================

// ===== 1. IMPORTS AND ENV =====
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import cors from 'cors';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { MongoClient, ObjectId } from 'mongodb';
import { ZodError, z } from 'zod';

// Load `.env` for local development only. Production hosts (Render/Railway)
// inject environment variables directly, so a missing file is not an error.
if (process.env.NODE_ENV !== 'test') {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: fall back to variables provided by the shell or host.
  }
}

// `--memdb` boots a throwaway MongoDB before env validation so MONGODB_URI is
// present. mongodb-memory-server is a devDependency and is imported lazily, so
// production never loads it.
let memdbServer;
if (process.argv.includes('--memdb')) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memdbServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memdbServer.getUri();
  console.log(`[dev] In-memory MongoDB listening at ${process.env.MONGODB_URI}`);
}

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

const isTest = env.NODE_ENV === 'test';

// ===== 2. CONSTANTS =====
export const ROLES = Object.freeze({
  STUDENT: 'student',
  DEPARTMENT: 'department',
  ADMIN: 'admin',
});

export const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
});

// Extra admin capabilities. A permission is never a role (blueprint §1.7).
export const PERMISSIONS = Object.freeze({
  REVEAL_IDENTITY: 'REVEAL_IDENTITY',
  MANAGE_USERS: 'MANAGE_USERS',
});

const VERIFICATION_DECISIONS = Object.freeze({
  APPROVE: 'approve',
  REJECT: 'reject',
});

// ===== 3. FIREBASE ADMIN AND MONGODB =====
let authInstance;

// firebase-admin is imported dynamically on first use. Two reasons:
// 1. Tests inject a fake verifier and must never load firebase-admin (its
//    `jose` dependency is ESM-only, which Jest cannot require).
// 2. A misconfigured deployment fails at first auth call with a clear error
//    instead of crashing unrelated routes.
const loadFirebaseAuth = async () => {
  if (authInstance) {
    return authInstance;
  }

  const { cert, getApps, initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY,
      }),
    });

  authInstance = getAuth(app);
  return authInstance;
};

const getFirebaseAuth = loadFirebaseAuth;

// The single token-verification dependency the middleware is built around
// (blueprint §14.1: injectable so tests can pass a fake).
const verifyFirebaseIdToken = async (token, checkRevoked = false) => {
  const auth = await loadFirebaseAuth();
  return auth.verifyIdToken(token, checkRevoked);
};

// Native MongoDB driver (blueprint §6). One client per process; `db` is the
// database named in MONGODB_URI (or `test` when the URI omits it, matching the
// previous driver's default).
let client;
let db;
let dbConnected = false;

// Collection handles are resolved lazily (section 4), so importing this module
// never requires a live connection — tests connect in beforeAll.
export const getDb = () => {
  if (!db) {
    throw new Error('MongoDB is not connected. Call connectDb() first.');
  }

  return db;
};

export const connectDb = async (uri = env.MONGODB_URI) => {
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10_000,
  });

  await client.connect();
  db = client.db();
  dbConnected = true;

  logger.info('MongoDB connected', {
    host: client.options.hosts?.[0]?.host ?? 'unknown',
    database: db.databaseName,
  });
};

export const disconnectDb = async () => {
  await client?.close();
  client = null;
  db = null;
  dbConnected = false;
};

// Synchronous so /health can report readiness without awaiting a ping.
const dbState = () => (dbConnected ? 'connected' : 'disconnected');

// ===== 4. COLLECTION HANDLES, INDEXES AND DOCUMENT SHAPES =====
// Plain `db.collection('name')` handles, per blueprint §6. Getters keep them
// usable before connect while still reading like the blueprint's examples.
export const collections = {
  get users() {
    return getDb().collection('users');
  },
};

// Safe to run on every boot: createIndex is idempotent. Index names are left to
// the driver so they match the ones created previously (no duplicates on an
// existing Atlas database).
export const ensureIndexes = async () => {
  await collections.users.createIndex({ firebaseUid: 1 }, { unique: true });
  // Not in §6.2's index list, but registration returns 409 on a duplicate
  // email, so the unique constraint is part of the current behavior.
  await collections.users.createIndex({ email: 1 }, { unique: true });
  await collections.users.createIndex({ role: 1, status: 1 });
  // Sparse: officers and admins have no studentProfile at all.
  await collections.users.createIndex(
    { 'studentProfile.studentId': 1 },
    { unique: true, sparse: true },
  );
};

// Document shapes replace the Mongoose schema: every write is validated here
// before insertOne/updateOne (§6 driver note). Fields match §6.2 exactly.
const objectIdField = z.instanceof(ObjectId);

const studentProfileDocument = z.strictObject({
  studentId: z.string().min(1).max(30),
  academicDepartment: z.string().max(120).optional(),
  batch: z.string().max(40).optional(),
  semester: z.string().max(40).optional(),
});

const userDocumentSchema = z.strictObject({
  _id: objectIdField.optional(),
  firebaseUid: z.string().min(1),
  email: z.string().min(1),
  name: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
  role: z.enum(Object.values(ROLES)),
  status: z.enum(Object.values(USER_STATUS)),
  studentProfile: studentProfileDocument.optional(),
  departmentRef: objectIdField.nullable().optional(),
  permissions: z.array(z.enum(Object.values(PERMISSIONS))),
  verifiedBy: objectIdField.nullable().optional(),
  verifiedAt: z.date().nullable().optional(),
  verificationNote: z.string().max(500).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const userUpdateSchema = userDocumentSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: 'An update must change at least one field.',
  });

const assertUserDocument = (document) => userDocumentSchema.parse(document);
const assertUserUpdate = (update) => userUpdateSchema.parse(update);

// ===== 5. HELPERS =====
// Operational errors use one of the blueprint's stable error codes so the
// frontend can branch on `error.code` instead of message text.
class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Request validation failed.', details) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthenticated(message = 'Authentication is required.') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have access to this resource.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static profileRequired(message = 'Complete your profile to continue.') {
    return new ApiError(403, 'PROFILE_REQUIRED', message);
  }

  static accountNotActive(message = 'Your account is not active.') {
    return new ApiError(403, 'ACCOUNT_NOT_ACTIVE', message);
  }

  static emailNotVerified(message = 'Verify your email address to continue.') {
    return new ApiError(403, 'EMAIL_NOT_VERIFIED', message);
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Request conflicts with the current state.') {
    return new ApiError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Too many requests. Please try again later.') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
}

// Express 5 forwards rejected promises to the error handler on its own, but
// wrapping keeps handlers explicit and safe if middleware is ever downgraded.
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const write = (level, message, meta = {}) => {
  const entry = { level, message, timestamp: new Date().toISOString(), ...meta };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
};

// Structured, one-line JSON logs. Never log complaint text, names, emails or
// tokens here; audit-worthy actions go to the auditLogs collection (M4).
const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};

// Response metadata for `?page=&limit=` list endpoints (blueprint §5.3).
const buildPaginationMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

// Escapes user input before it is embedded in a RegExp, so a search box cannot
// inject regex syntax or cause catastrophic backtracking.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Kept separate so later milestones can add readiness fields (Firebase, AI
// provider) without touching the route.
const buildHealthPayload = () => ({
  status: 'ok',
  uptime: Number(process.uptime().toFixed(2)),
  timestamp: new Date().toISOString(),
  version: pkg.version,
  environment: env.NODE_ENV,
  database: dbState(),
});

// ===== 6. MIDDLEWARE =====
// Builds the bearer-token middleware around an injected verifier
// (production: firebase-admin; tests: a fake — blueprint §14.1).
const createVerifyToken = (verifyIdToken, { checkRevoked = false } = {}) =>
  asyncHandler(async (req, _res, next) => {
    const header = req.get('authorization') ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthenticated('Missing or malformed Authorization header.');
    }

    let decoded;
    try {
      decoded = await verifyIdToken(token, checkRevoked);
    } catch {
      // Never log the token or the provider error message.
      throw ApiError.unauthenticated('Invalid or expired authentication token.');
    }

    req.auth = decoded;
    next();
  });

// Attaches the MongoDB user for the verified Firebase token. A signed-in user
// without a profile is not an error for status checks (GET /auth/me), so the
// middleware reports PROFILE_REQUIRED and the client routes to onboarding.
const loadUser = asyncHandler(async (req, _res, next) => {
  const user = await collections.users.findOne({ firebaseUid: req.auth.uid });

  if (!user) {
    throw ApiError.profileRequired();
  }

  req.user = user;
  next();
});

// Account-state gate for business routes. Kept separate from loadUser so the
// pending-approval screen can read the user's own status (blueprint §4.1).
const requireActive = (req, _res, next) => {
  if (req.user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.accountNotActive();
  }

  next();
};

// Role gate. Roles always come from the database, never from the token (§7.4).
const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) {
      throw ApiError.unauthenticated();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden();
    }

    next();
  };

// Validates body/query/params against Zod schemas and replaces the raw input
// with parsed (stripped, coerced) values. Express 5 exposes `req.query` as a
// read-only getter, so validated query data is exposed as `req.validatedQuery`.
const validate =
  ({ body, query, params } = {}) =>
  (req, _res, next) => {
    const details = [];

    const run = (schema, value, prefix) => {
      if (!schema) {
        return undefined;
      }

      const result = schema.safeParse(value);
      if (result.success) {
        return result.data;
      }

      details.push(
        ...result.error.issues.map((issue) => ({
          path: [prefix, ...issue.path].filter(Boolean).join('.'),
          message: issue.message,
        })),
      );
      return undefined;
    };

    const validatedBody = run(body, req.body, 'body');
    const validatedQuery = run(query, req.query, 'query');
    const validatedParams = run(params, req.params, 'params');

    if (details.length > 0) {
      return next(ApiError.badRequest('Request validation failed.', details));
    }

    if (body) {
      req.body = validatedBody;
    }
    if (query) {
      req.validatedQuery = validatedQuery;
    }
    if (params) {
      req.params = validatedParams;
    }

    next();
  };

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 6;
const STRIPPED = Symbol('stripped');

const sanitizeValue = (value, depth = 0) => {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1)).filter((item) => item !== STRIPPED);
  }

  const keys = Object.keys(value);
  const clean = {};

  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key) || key.startsWith('$') || key.includes('.')) {
      continue;
    }

    const item = sanitizeValue(value[key], depth + 1);
    if (item === STRIPPED) {
      continue;
    }

    clean[key] = item;
  }

  // An object that only carried operator keys is dropped entirely, so
  // `{ email: { $ne: null } }` becomes `{}` rather than `{ email: {} }`.
  if (keys.length > 0 && Object.keys(clean).length === 0) {
    return STRIPPED;
  }

  return clean;
};

// Removes MongoDB operator keys ($gt, $where) and dotted/prototype keys from the
// request body. Replaces express-mongo-sanitize, which does not support
// Express 5 (it assigns to the read-only req.query getter). Queries are already
// validated with strict Zod schemas and never passed to the driver raw.
export const sanitizeRequest = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    const clean = sanitizeValue(req.body);
    req.body = clean === STRIPPED ? {} : clean;
  }

  next();
};

const rateLimitEnvelope = (message) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
});

const skipInTest = () => isTest;

// Global ceiling for the whole API (§8.2). Stricter limiters sit on auth routes
// now and will sit on complaint submission and identity reveal later.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, res) => {
    res.status(429).json(rateLimitEnvelope('Too many requests. Please try again later.'));
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, res) => {
    res.status(429).json(rateLimitEnvelope('Too many attempts. Please wait before trying again.'));
  },
});

// ===== 7. SERIALIZERS =====
// Role-aware serializers: never return a database document directly
// (blueprint §8.1). `firebaseUid` and other internals stay server-side.

const refId = (value) => {
  if (!value) {
    return null;
  }
  return typeof value === 'object' && value._id ? value._id.toString() : value.toString();
};

const studentProfile = (user) =>
  user.studentProfile?.studentId
    ? {
        studentId: user.studentProfile.studentId,
        academicDepartment: user.studentProfile.academicDepartment ?? null,
        batch: user.studentProfile.batch ?? null,
        semester: user.studentProfile.semester ?? null,
      }
    : null;

const base = (user) => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name,
  phone: user.phone ?? null,
  role: user.role,
  status: user.status,
  permissions: [...user.permissions],
  departmentRef: refId(user.departmentRef),
  studentProfile: studentProfile(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// The signed-in user's own profile (GET /auth/me, PATCH /users/me).
const serializeSelf = (user) => base(user);

// Admin user management (verification queue). Admins need the student ID to
// compare against university records, so it is included for this audience only.
const serializeAdminUser = (user) => ({
  ...base(user),
  verifiedAt: user.verifiedAt ?? null,
  verifiedBy: refId(user.verifiedBy),
  verificationNote: user.verificationNote ?? null,
});

// ===== 8. SERVICES =====
const registerStudentProfile = async ({ auth, payload }) => {
  if (!auth.email_verified) {
    throw ApiError.emailNotVerified('Verify your email address before completing your profile.');
  }

  if (!auth.email) {
    throw ApiError.badRequest('The authentication token does not contain an email address.');
  }

  const existing = await collections.users.findOne(
    { firebaseUid: auth.uid },
    { projection: { _id: 1 } },
  );
  if (existing) {
    throw ApiError.conflict('A profile already exists for this account.');
  }

  const now = new Date();
  const document = assertUserDocument({
    firebaseUid: auth.uid,
    // Mongoose used to lowercase this; keep the unique index semantics.
    email: auth.email.toLowerCase(),
    name: payload.name,
    ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
    // Server-decided fields — never taken from the request body.
    role: ROLES.STUDENT,
    status: USER_STATUS.PENDING,
    permissions: [],
    studentProfile: {
      studentId: payload.studentId,
      academicDepartment: payload.academicDepartment,
      batch: payload.batch,
      semester: payload.semester,
    },
    departmentRef: null,
    verifiedBy: null,
    verifiedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  try {
    const { insertedId } = await collections.users.insertOne(document);
    return { ...document, _id: insertedId };
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict('That email address or student ID is already registered.');
    }
    throw error;
  }
};

const updateOwnProfile = async (user, payload) => {
  const changes = {};

  if (payload.name !== undefined) {
    changes.name = payload.name;
  }
  if (payload.phone !== undefined) {
    changes.phone = payload.phone;
  }
  // Timestamps are set by hand now (blueprint §6 driver note).
  changes.updatedAt = new Date();

  assertUserUpdate(changes);

  return collections.users.findOneAndUpdate(
    { _id: user._id },
    { $set: changes },
    { returnDocument: 'after' },
  );
};

const listUsers = async ({ role, status, q, page, limit }) => {
  const filter = {};

  if (role) {
    filter.role = role;
  }
  if (status) {
    filter.status = status;
  }
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { 'studentProfile.studentId': pattern }];
  }

  const [items, total] = await Promise.all([
    collections.users
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collections.users.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta({ page, limit, total }) };
};

const verifyUser = async ({ actor, targetId, decision, note }) => {
  if (!ObjectId.isValid(targetId)) {
    throw ApiError.badRequest('Invalid identifier format.');
  }

  const target = await collections.users.findOne({ _id: new ObjectId(targetId) });

  if (!target) {
    throw ApiError.notFound('User not found.');
  }

  if (target.role !== ROLES.STUDENT) {
    throw ApiError.conflict('Only student accounts can be verified.');
  }

  if (target.status !== USER_STATUS.PENDING) {
    throw ApiError.conflict('Only pending accounts can be verified.');
  }

  const now = new Date();
  const changes = {
    status: decision === VERIFICATION_DECISIONS.APPROVE ? USER_STATUS.ACTIVE : USER_STATUS.REJECTED,
    verifiedBy: actor._id,
    verifiedAt: now,
    updatedAt: now,
  };

  if (note !== undefined) {
    changes.verificationNote = note;
  }

  assertUserUpdate(changes);

  return collections.users.findOneAndUpdate(
    { _id: target._id },
    { $set: changes },
    { returnDocument: 'after' },
  );
};

// ===== 9. ROUTES =====
// --- auth ---
const trimmed = (min, max, label) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, { error: `${label} must be at least ${min} characters` })
    .max(max, { error: `${label} must be at most ${max} characters` });

// Profile creation for a signed-in, email-verified student. `role` and `status`
// are deliberately absent: the server assigns them (no mass assignment, §8.2).
const registerProfileSchema = z.strictObject({
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

const registerProfile = asyncHandler(async (req, res) => {
  const user = await registerStudentProfile({ auth: req.auth, payload: req.body });

  res.status(201).json({ success: true, data: serializeSelf(user) });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: serializeSelf(req.user) });
});

const createAuthRouter = ({ verifyToken }) => {
  const router = Router();

  // First profile creation: signed in and email-verified, but no MongoDB user yet.
  router.post(
    '/register-profile',
    verifyToken,
    validate({ body: registerProfileSchema }),
    registerProfile,
  );

  // Works for pending/suspended users too, so the client can show the right
  // gate screen (pending approval, rejected, suspended).
  router.get('/me', verifyToken, loadUser, me);

  return router;
};

// --- users ---
const phoneField = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{6,30}$/, { error: 'Phone number format is invalid' });

// Self-service profile edit: only these two fields are accepted, so `role`,
// `status` and `permissions` in the body are rejected as unknown keys.
const updateMeSchema = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(2, { error: 'Name must be at least 2 characters' })
      .max(120)
      .optional(),
    phone: phoneField.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Provide at least one field to update.',
  });

const adminListQuerySchema = z.strictObject({
  role: z.enum(Object.values(ROLES)).optional(),
  status: z.enum(Object.values(USER_STATUS)).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const userIdParamsSchema = z.strictObject({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, { error: 'Invalid user id' }),
});

const verifyUserSchema = z.strictObject({
  decision: z.enum(Object.values(VERIFICATION_DECISIONS), {
    error: 'Decision must be approve or reject',
  }),
  note: z.string().trim().max(500, { error: 'Note must be at most 500 characters' }).optional(),
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await updateOwnProfile(req.user, req.body);

  res.status(200).json({ success: true, data: serializeSelf(user) });
});

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await listUsers(req.validatedQuery);

  res.status(200).json({ success: true, data: items.map(serializeAdminUser), meta });
});

const verify = asyncHandler(async (req, res) => {
  const user = await verifyUser({
    actor: req.user,
    targetId: req.params.id,
    ...req.body,
  });

  res.status(200).json({ success: true, data: serializeAdminUser(user) });
});

// /api/v1/users — signed-in user's own resources.
const createUsersRouter = ({ verifyToken }) => {
  const router = Router();

  router.patch(
    '/me',
    verifyToken,
    loadUser,
    requireActive,
    validate({ body: updateMeSchema }),
    updateMe,
  );

  return router;
};

// /api/v1/admin/users — admin-only user management. Token revocation is checked
// because these routes can change account state (blueprint §7.3).
const createAdminUsersRouter = ({ verifyToken }) => {
  const router = Router();

  router.use(verifyToken, loadUser, authorize(ROLES.ADMIN), requireActive);

  router.get('/', validate({ query: adminListQuerySchema }), list);
  router.patch(
    '/:id/verify',
    validate({ params: userIdParamsSchema, body: verifyUserSchema }),
    verify,
  );

  return router;
};

// ===== 10. 404 AND ERROR HANDLER =====
const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.path} not found.`));
};

const errorEnvelope = (code, message, details) => ({
  success: false,
  error: { code, message, ...(details ? { details } : {}) },
});

// Single JSON error shape for every failure (blueprint §5.3).
const errorHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong.';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err?.name === 'BSONError') {
    // Invalid ObjectId or BSON value; routes validate ids first, so this is a
    // defensive fallback with the same shape the old CastError branch had.
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid identifier format.';
  } else if (err?.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'That record already exists.';
  } else if (err?.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request body must be valid JSON.';
  } else if (err?.type === 'entity.too.large') {
    statusCode = 413;
    code = 'VALIDATION_ERROR';
    message = 'Request body is too large.';
  }

  if (statusCode >= 500) {
    logger.error('Unhandled request error', {
      method: req.method,
      path: req.path,
      error: err?.message,
      ...(env.NODE_ENV === 'production' ? {} : { stack: err?.stack }),
    });
  } else {
    logger.warn('Request rejected', {
      method: req.method,
      path: req.path,
      statusCode,
      code,
    });
  }

  res.status(statusCode).json(errorEnvelope(code, message, details));
};

// ===== 11. STARTUP =====
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

// Exported for Supertest (blueprint §14.1). Tests that need a fake token
// verifier call `createApp({ verifyIdToken })` instead.
export const app = createApp();

const seedFirstAdmin = async () => {
  if (!env.SEED_ADMIN_EMAIL) {
    throw new Error('SEED_ADMIN_EMAIL is required to seed the first admin.');
  }

  const name = env.SEED_ADMIN_NAME ?? 'System Administrator';
  const auth = await getFirebaseAuth();

  let firebaseUser;
  try {
    firebaseUser = await auth.getUserByEmail(env.SEED_ADMIN_EMAIL);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }

    firebaseUser = await auth.createUser({
      email: env.SEED_ADMIN_EMAIL,
      emailVerified: true,
      displayName: name,
      password: randomBytes(24).toString('base64url'),
    });

    const resetLink = await auth.generatePasswordResetLink(env.SEED_ADMIN_EMAIL);
    logger.info('Created Firebase admin user. Set its password with this one-time link.', {
      email: env.SEED_ADMIN_EMAIL,
      resetLink,
    });
  }

  const now = new Date();
  const changes = {
    email: env.SEED_ADMIN_EMAIL,
    name,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    permissions: [PERMISSIONS.REVEAL_IDENTITY, PERMISSIONS.MANAGE_USERS],
    updatedAt: now,
  };

  assertUserUpdate(changes);

  const admin = await collections.users.findOneAndUpdate(
    { firebaseUid: firebaseUser.uid },
    {
      $set: changes,
      // The upsert filter already supplies firebaseUid.
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );

  logger.info('First admin ready', { id: admin._id.toString(), email: admin.email });
};

const stopMemdb = async () => {
  await memdbServer?.stop();
};

const start = async () => {
  await connectDb();
  await ensureIndexes();

  const server = app.listen(env.PORT, () => {
    logger.info('API listening', { port: env.PORT, environment: env.NODE_ENV });
  });

  const shutdown = (signal) => {
    logger.info('Shutting down', { signal });

    server.close(async () => {
      await disconnectDb();
      await stopMemdb();
      process.exit(0);
    });

    // Do not hang forever if a connection refuses to close.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      error: reason instanceof Error ? reason.message : String(reason),
    });
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message });
    shutdown('uncaughtException');
  });
};

const runSeed = async () => {
  await connectDb();
  await ensureIndexes();

  try {
    await seedFirstAdmin();
  } finally {
    await disconnectDb();
    await stopMemdb();
  }
};

const bootstrap = async () => {
  // Tests import `app`; they must never open a port or connect here.
  if (isTest) {
    return;
  }

  if (process.argv.includes('--seed')) {
    await runSeed();
    return;
  }

  await start();
};

bootstrap().catch((error) => {
  const seeding = process.argv.includes('--seed');
  logger.error(seeding ? 'Seed failed' : 'Failed to start API', { error: error.message });
  process.exit(1);
});
