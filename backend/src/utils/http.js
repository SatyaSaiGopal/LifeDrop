const ApiError = require('./ApiError');

/**
 * Wrap async route handlers so rejected promises reach the error middleware
 * without a try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/** Uniform success envelope: { success: true, data, meta? } */
function sendOk(res, data, meta) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(200).json(body);
}

function sendCreated(res, data) {
  return res.status(201).json({ success: true, data });
}

/** Uniform pagination meta derived from a page/limit/total triple. */
function paginationMeta(page, limit, total) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

module.exports = { asyncHandler, sendOk, sendCreated, ApiError, paginationMeta };
