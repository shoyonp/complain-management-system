// Express 5 forwards rejected promises to the error handler on its own, but
// wrapping keeps handlers explicit and safe if middleware is ever downgraded.
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
