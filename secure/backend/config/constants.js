module.exports = {
  AUTH: {
    JWT_SECRET: process.env.JWT_SECRET || 'smvwa-dev-jwt-secret-change-me',
    PASSWORD_RESET_TOKEN_TTL_MINUTES: 10,
  },
  CSRF: {
    COOKIE_NAME: 'csrf_token',
    HEADER_NAME: 'x-csrf-token',
    TOKEN_BYTES: 32,
    COOKIE_MAX_AGE_MS: 24 * 60 * 60 * 1000,
  },
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    SEARCH_LIMIT: 50,
    USER_SUGGESTIONS_LIMIT: 5,
    SEARCH_USERS_LIMIT: 20,
  },
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
};
