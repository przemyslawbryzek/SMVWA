require('dotenv').config();
const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { setupWebSocket } = require('./websocket');
const { INTERNAL_SECRET } = require('./config/constants');

/**
 * Patches the outgoing http/https modules so that every request made inside this
 * process automatically carries the x-internal-secret header.  This lets the
 * backend call its own API endpoints (e.g. via the preview route) and be
 * recognised as a trusted internal caller without needing a user cookie.
 *
 * NOTE: The patch is intentionally applied globally so that all code paths
 * (including third-party libraries) benefit from it.  Be aware that this means
 * outgoing requests to *external* hosts will also carry the header — that is an
 * acceptable trade-off for this educational application.
 */
function patchOutgoing(mod) {
  const origRequest = mod.request.bind(mod);

  mod.request = function (...args) {
    let [urlOrOpts, optsOrCb, cb] = args;
    if (typeof urlOrOpts === 'string' || urlOrOpts instanceof URL) {
      if (optsOrCb && typeof optsOrCb === 'object' && typeof optsOrCb !== 'function') {
        optsOrCb = Object.assign({}, optsOrCb, { headers: Object.assign({ 'x-internal-secret': INTERNAL_SECRET }, optsOrCb.headers) });
        return origRequest(urlOrOpts, optsOrCb, cb);
      } else {
        return origRequest(urlOrOpts, { headers: { 'x-internal-secret': INTERNAL_SECRET } }, optsOrCb);
      }
    } else {
      urlOrOpts = Object.assign({}, urlOrOpts, { headers: Object.assign({ 'x-internal-secret': INTERNAL_SECRET }, urlOrOpts.headers) });
      return origRequest(urlOrOpts, optsOrCb);
    }
  };

  mod.get = function (...args) {
    const req = mod.request(...args);
    req.end();
    return req;
  };
}

patchOutgoing(http);
patchOutgoing(https);

const app = express();
const PORT = process.env.PORT || 3001;

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const usersRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://frontend:3000'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`API Backend działa na http://localhost:${PORT}`);
  console.log(`WebSocket działa na ws://localhost:${PORT}`);
});
