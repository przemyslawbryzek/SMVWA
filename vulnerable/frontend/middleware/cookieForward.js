const { INTERNAL_SECRET } = require('../config');

function getAxiosConfig(req) {
  const hasCookie = req.cookies && req.cookies.auth;
  const config = {
    headers: {},
    withCredentials: true,
  };

  if (hasCookie) {
    config.headers['Cookie'] = `auth=${req.cookies.auth}`;
  } 

  return config;
}

module.exports = {
  getAxiosConfig,
};
