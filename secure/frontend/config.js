module.exports = {
  API_URL: process.env.API_URL || 'http://localhost:3001',
  JWT_SECRET: process.env.JWT_SECRET || 'smvwa-dev-jwt-secret-change-me',
  CSRF: {
    COOKIE_NAME: 'csrf_token',
    HEADER_NAME: 'x-csrf-token',
    TOKEN_BYTES: 32,
    COOKIE_MAX_AGE_MS: 24 * 60 * 60 * 1000,
  },
};
