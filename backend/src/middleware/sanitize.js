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
