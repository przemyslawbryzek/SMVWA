const crypto = require('crypto');
const { HTTP_STATUS, CSRF } = require('../config/constants');

const CSRF_COOKIE_NAME = CSRF.COOKIE_NAME;
const CSRF_HEADER_NAME = CSRF.HEADER_NAME;

function shouldBypassCsrf() {
  return process.env.NODE_ENV === 'test' || process.env.CSRF_DISABLED === 'true';
}

function generateCsrfToken() {
  return crypto.randomBytes(CSRF.TOKEN_BYTES).toString('hex');
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function ensureCsrfCookie(req, res, next) {
  if (shouldBypassCsrf()) {
    return next();
  }

  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: CSRF.COOKIE_MAX_AGE_MS,
    });
  }

  return next();
}

function requireCsrf(req, res, next) {
  if (shouldBypassCsrf()) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME) || req.body?._csrf;

  if (!cookieToken || !headerToken) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Missing CSRF token' });
  }

  if (!safeCompare(cookieToken, headerToken)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Invalid CSRF token' });
  }

  return next();
}

module.exports = {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  ensureCsrfCookie,
  requireCsrf,
};
