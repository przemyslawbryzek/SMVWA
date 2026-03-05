const express = require('express');
const router = express.Router();

// IMPORTANT: registration order matters.
// Named routes (/search, /user, /user/:id, /followed, /preview)
// must be registered before the generic /:id routes.
require('./preview')(router);
require('./feed')(router);
require('./crud')(router);
require('./actions')(router);

module.exports = router;
