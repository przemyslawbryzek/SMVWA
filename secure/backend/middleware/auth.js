const jwt = require('jsonwebtoken');
const { AUTH } = require('../config/constants');
const { isTokenBlacklisted } = require('../utils/tokenBlacklist');

function decodeToken(rawCookie) {
  return jwt.verify(rawCookie, AUTH.JWT_SECRET);
}

/**
 * Attempts to resolve the authenticated user from the request.
 *
 * Returns `{ user, error }` where:
 *   - `user`  is the decoded payload (or `null` when no credentials are present)
 *   - `error` is `'invalid'` when a cookie exists but cannot be decoded
 *
 * Using a shared helper keeps `authMiddleware` and `optionalAuthMiddleware`
 * in sync without duplicating cookie decoding logic.
 *
 * @param {import('express').Request} req
 * @returns {{ user: object|null, error: string|null }}
 */
async function _buildUser(req) {
  const authCookie = req.cookies.auth;
  if (!authCookie) {
    return { user: null, error: null };
  }

  if (await isTokenBlacklisted(authCookie)) {
    return { user: null, error: 'revoked' };
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
async function authMiddleware(req, res, next) {
  let user;
  let error;

  try {
    ({ user, error } = await _buildUser(req));
  } catch (lookupError) {
    console.error('Auth token validation failed:', lookupError.message);
    return res.status(500).json({ error: 'Failed to validate auth token' });
  }

  if (error === 'revoked') {
    return res.status(401).json({ error: 'Token has been revoked' });
  }
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
async function optionalAuthMiddleware(req, res, next) {
  try {
    const { user } = await _buildUser(req);
    req.user = user;
  } catch {
    req.user = null;
  }
  next();
}

/**
 * Requires the authenticated user to have the `admin` role.
 * Must be used after `authMiddleware`.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admins only' });
  }
  next();
}

module.exports = { authMiddleware, optionalAuth: optionalAuthMiddleware, requireAdmin };

