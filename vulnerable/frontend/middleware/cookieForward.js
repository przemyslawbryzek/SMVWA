function getAxiosConfig(req) {
  const config = {
    headers: {},
    withCredentials: true
  };

  if (req.cookies && req.cookies.auth) {
    config.headers['Cookie'] = `auth=${req.cookies.auth}`;
  } else if (req.headers.cookie) {
    config.headers['Cookie'] = req.headers.cookie;
  }

  return config;
}

function attachAxiosConfig(req, res, next) {
  req.axiosConfig = getAxiosConfig(req);
  next();
}

module.exports = {
  getAxiosConfig,
  attachAxiosConfig
};
