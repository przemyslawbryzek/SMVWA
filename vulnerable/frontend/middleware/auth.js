function decodeAuthCookie(req) {
  const raw = req.cookies?.auth;
  if (!raw) {return null;}
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}
function requireAuth(req, res, next) {
  if (!decodeAuthCookie(req)) {return res.redirect('/login');}
  next();
}
function requireAdmin(req, res, next) {
  const user = decodeAuthCookie(req);
  if (!user) {return res.redirect('/login');}
  if (user.role !== 'admin') {return res.status(403).send('Access denied: admins only');}
  next();
}
function withRole(user, req) {
  if (!user) {return null;}
  const payload = decodeAuthCookie(req);
  return { ...user, role: payload?.role || 'user' };
}

module.exports = { decodeAuthCookie, requireAuth, requireAdmin, withRole };
