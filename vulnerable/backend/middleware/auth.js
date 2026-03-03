function authMiddleware(req, res, next) {
  const authCookie = req.cookies.auth;
  if (!authCookie) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
    req.user = JSON.parse(decoded);
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Invalid auth token' });
  }
}

function optionalAuthMiddleware(req, res, next) {
  const authCookie = req.cookies.auth;
  if (!authCookie) {
    req.user = null;
    return next();
  }

  try {
    const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
    req.user = JSON.parse(decoded);
    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

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
