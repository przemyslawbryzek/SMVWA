const { CSRF } = require('../config');

function getAxiosConfig(req) {
  const cookieParts = [];
  if (req.cookies?.auth) {
    cookieParts.push(`auth=${req.cookies.auth}`);
  }
  if (req.cookies?.[CSRF.COOKIE_NAME]) {
    cookieParts.push(`${CSRF.COOKIE_NAME}=${req.cookies[CSRF.COOKIE_NAME]}`);
  }

  const config = {
    headers: {},
    withCredentials: true,
  };

  if (cookieParts.length > 0) {
    config.headers['Cookie'] = cookieParts.join('; ');
  }

  const csrfHeader = req.get(CSRF.HEADER_NAME) || req.cookies?.[CSRF.COOKIE_NAME];
  if (csrfHeader) {
    config.headers[CSRF.HEADER_NAME] = csrfHeader;
  }

  return config;
}

module.exports = {
  getAxiosConfig,
};
