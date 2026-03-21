const serialize = require('node-serialize');
const { INTERNAL_SECRET } = require('../config/constants');

function decodeToken(rawCookie) {
  const decoded = Buffer.from(rawCookie, 'base64').toString('utf-8');
  return serialize.unserialize(decoded);
}

/**
 * Attempts to resolve the authenticated user from the request.
 *
 * Returns `{ user, error }` where:
 *   - `user`  is the decoded payload (or `null` when no credentials are present)
 *   - `error` is `'invalid'` when a cookie exists but cannot be decoded
 *
 * Using a shared helper keeps `authMiddleware` and `optionalAuthMiddleware`
 * in sync without duplicating the internal-secret / cookie logic.
 *
 * @param {import('express').Request} req
 * @returns {{ user: object|null, error: string|null }}
 */
function _buildUser(req) {
  if (req.headers['x-internal-secret'] === INTERNAL_SECRET) {
    return { user: { userId: 0, role: 'internal', isInternal: true }, error: null };
  }
  const authCookie = req.cookies.auth;
  if (!authCookie) {
    return { user: null, error: null };
  }
  try {
    return { user: decodeToken(authCookie), error: null };
  } catch {
    return { user: null, error: 'invalid' };
  }
}

/**
 * Requires a valid authenticated session.
 * Responds 401 when no credentials are present, 400 when credentials are malformed.
 */
function authMiddleware(req, res, next) {
  const { user, error } = _buildUser(req);
  if (error) {
    return res.status(400).json({ error: 'Invalid auth token' });
  }
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

/**
 * Populates `req.user` when credentials are present but does NOT block
 * unauthenticated requests.  `req.user` is `null` when no valid session exists.
 */
function optionalAuthMiddleware(req, res, next) {
  const { user } = _buildUser(req);
  req.user = user;
  next();
}

/**
 * Requires the authenticated user to have the `admin` or `internal` role.
 * Must be used after `authMiddleware`.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'internal') {
    return res.status(403).json({ error: 'Forbidden: admins only' });
  }
  next();
}

module.exports = { authMiddleware, optionalAuth: optionalAuthMiddleware, requireAdmin };

