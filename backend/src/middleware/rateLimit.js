const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const skip = () => config.isTest;

/** Generous global limiter: a safety net against abuse, not a UX obstacle. */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, error: { message: 'Too many requests, please try again shortly', code: 429 } },
});

/** Tight limiter on credential endpoints to slow brute-force attempts. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip,
  message: { success: false, error: { message: 'Too many attempts. Please wait a few minutes and try again.', code: 429 } },
});

/** Protects write-heavy endpoints (requests, responses, uploads). */
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, error: { message: 'You are doing that too often. Please slow down.', code: 429 } },
});

module.exports = { globalLimiter, authLimiter, writeLimiter };
