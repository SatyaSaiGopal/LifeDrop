const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../services/token.service');
const User = require('../models/User');

const COOKIE_NAME = 'lifeline_token';

/**
 * Resolve the caller from the httpOnly cookie (web client) or an
 * `Authorization: Bearer <token>` header (API/mobile clients). Never throws on
 * a missing token — `requireAuth` decides whether that is fatal.
 */
async function attachUser(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    const token = req.cookies?.[COOKIE_NAME] || bearer;
    if (!token) return next();

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      // Expired/invalid token: clear the cookie so the client re-authenticates
      // cleanly instead of looping on a dead session.
      if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        res.clearCookie(COOKIE_NAME, { path: '/' });
        req.authError = err.name === 'TokenExpiredError' ? 'Your session has expired. Please sign in again.' : 'Invalid session.';
        return next();
      }
      throw err;
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      req.authError = 'Your account is no longer available.';
      return next();
    }
    req.user = user;
    req.token = token;
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Reject the request unless a valid user is attached. */
function requireAuth(req, _res, next) {
  if (req.user) return next();
  return next(ApiError.unauthorized(req.authError || 'Sign in to continue'));
}

/** Reject unless the authenticated user is a donor. */
function requireDonor(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized('Sign in to continue'));
  if (req.user.role !== 'donor' || !req.user.profile) {
    return next(ApiError.forbidden('Only registered donors can perform this action'));
  }
  return next();
}

/** Attach user if present but never block — used on public search endpoints. */
const optionalAuth = attachUser;

module.exports = { attachUser, requireAuth, requireDonor, optionalAuth, COOKIE_NAME };
