const config = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

/** 404 for any unmatched route. */
function notFound(req, _res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/**
 * Terminal error handler. Translates known error shapes into the standard
 * envelope and, crucially, never leaks a stack trace or driver message to the
 * client in production.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies handlers by arity
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.expose ? err.message : 'Something went wrong on our end';
  let details = err.details;

  // --- Mongoose: schema validation ---
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Please correct the highlighted fields';
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
  }

  // --- Mongo: duplicate key (e.g. email already registered) ---
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const labels = { email: 'email', user: 'donor profile' };
    message = `That ${labels[field] || field} is already in use`;
    details = { [field]: message };
  }

  // --- Mongoose: malformed ObjectId ---
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  }

  // --- Body parser: malformed JSON ---
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  }

  // --- Multer: upload limits ---
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = `Image must be smaller than ${Math.round(config.uploads.maxBytes / (1024 * 1024))} MB`;
  }

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}`, err);
    message = err.expose ? err.message : 'Something went wrong on our end';
  } else if (!config.isTest) {
    logger.debug(`${req.method} ${req.originalUrl} -> ${status}: ${message}`);
  }

  const body = { success: false, error: { message, code: status } };
  if (details) body.error.details = details;
  // Expose the stack only outside production, and only to help local debugging.
  if (!config.isProduction && status >= 500) body.error.stack = err.stack;

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
