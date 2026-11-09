import { ApiError } from '../utils/ApiError.js';

// Validates body/query/params against Zod schemas and replaces the raw input
// with parsed (stripped, coerced) values. Express 5 exposes `req.query` as a
// read-only getter, so validated query data is exposed as `req.validatedQuery`.
export const validate =
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
