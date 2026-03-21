const express = require('express');
const router = express.Router();

// Page routes split into sub-modules under ./pages/
require('./pages/feed')(router);
require('./pages/posts')(router);
require('./pages/profile')(router);
require('./pages/admin')(router);
require('./pages/misc')(router);

module.exports = router;
