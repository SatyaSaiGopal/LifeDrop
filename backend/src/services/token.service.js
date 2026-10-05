const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Issue a signed access token. The payload carries only the user id and role —
 * no personal data — so a leaked token cannot disclose profile information.
 */
function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'lifeline-api',
  });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret, { issuer: 'lifeline-api' });
}

/** Cookie options for the httpOnly session cookie used by the web client. */
function cookieOptions() {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // matches default JWT_EXPIRES_IN
  return {
    httpOnly: true,
    sameSite: config.isProduction ? 'none' : 'lax',
    secure: config.isProduction,
    maxAge,
    path: '/',
  };
}

module.exports = { signToken, verifyToken, cookieOptions };
