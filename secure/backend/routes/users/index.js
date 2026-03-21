const express = require('express');
const router = express.Router();

// Named routes (/profile, /suggestions, /search) must precede /:id routes.
require('./profile')(router);
require('./discovery')(router);
require('./social')(router);

module.exports = router;
