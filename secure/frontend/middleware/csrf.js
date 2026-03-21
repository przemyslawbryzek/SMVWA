const crypto = require('crypto');
const { CSRF } = require('../config');

const CSRF_COOKIE_NAME = CSRF.COOKIE_NAME;
const CSRF_HEADER_NAME = CSRF.HEADER_NAME;

function generateCsrfToken() {
  return crypto.randomBytes(CSRF.TOKEN_BYTES).toString('hex');
}

function ensureCsrfCookie(req, res, next) {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: CSRF.COOKIE_MAX_AGE_MS,
    });
  }

  next();
}

module.exports = {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  ensureCsrfCookie,
};
