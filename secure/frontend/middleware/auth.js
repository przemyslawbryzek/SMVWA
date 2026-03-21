const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function decodeAuthCookie(req) {
  const raw = req.cookies?.auth;
  if (!raw) {return null;}
  try {
    return jwt.verify(raw, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  if (!decodeAuthCookie(req)) {return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));}
  next();
}

function requireAdmin(req, res, next) {
  const user = decodeAuthCookie(req);
  if (!user) {return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));}
  if (user.role !== 'admin') {return res.status(403).send('Access denied: admins only');}
  next();
}

/**
 * Merges a user object (from the API) with the `role` field from the already-decoded
 * cookie payload.  Avoids re-decoding the cookie on every request.
 *
 * @param {object|null} user     User object returned by the backend API
 * @param {object|null} payload  Pre-decoded cookie payload (e.g. `res.locals.authPayload`)
 * @returns {object|null}
 */
function withRole(user, payload) {
  if (!user) {return null;}
  return { ...user, role: payload?.role || 'user' };
}

function optionalAuth(req, res, next) {
  req.user = decodeAuthCookie(req) || null;
  next();
}

module.exports = { decodeAuthCookie, requireAuth, requireAdmin, optionalAuth, withRole };

