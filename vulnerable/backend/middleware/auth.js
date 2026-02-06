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

module.exports = authMiddleware;
