/**
 * Decodes the base64-encoded `auth` cookie into a plain object.
 * Returns null if missing or malformed.
 * @param {import('express').Request} req
 * @returns {{ userId: number, role: string } | null}
 */
function decodeAuthCookie(req) {
  const raw = req.cookies?.auth;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Redirects to /login if the user is not authenticated.
 */
function requireAuth(req, res, next) {
  if (!decodeAuthCookie(req)) return res.redirect('/login');
  next();
}

/**
 * Returns 403 if the authenticated user is not an admin.
 * Also redirects to /login if not authenticated at all.
 */
function requireAdmin(req, res, next) {
  const user = decodeAuthCookie(req);
  if (!user) return res.redirect('/login');
  if (user.role !== 'admin') return res.status(403).send('Access denied: admins only');
  next();
}

/**
 * Merges the `role` field from the auth cookie into a user object.
 * Safe to call even when user is null — returns null in that case.
 * @param {object|null} user
 * @param {import('express').Request} req
 * @returns {object|null}
 */
function withRole(user, req) {
  if (!user) return null;
  const payload = decodeAuthCookie(req);
  return { ...user, role: payload?.role || 'user' };
}

module.exports = { decodeAuthCookie, requireAuth, requireAdmin, withRole };
