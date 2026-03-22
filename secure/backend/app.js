require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { setupWebSocket } = require('./websocket');
const { ensureCsrfCookie } = require('./middleware/csrf');
const pool = require('./db/pool');

const rateLimit = require('express-rate-limit');

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
app.use(ensureCsrfCookie);
app.set('trust proxy', 1);

// --- Rate limiting ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Too many requests, try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  message: { error: 'Too many posts/actions, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5,
  message: { error: 'Too many uploads, try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const previewLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 10,
  message: { error: 'Too many previews, try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth endpoints (register, login, reset-password)
app.use('/api/auth', authLimiter, authRoutes);
// Posts endpoints (create, like, repost, report, comments, thread)
app.use('/api/posts', postLimiter, postsRoutes);
// User actions (follow, report)
app.use('/api/users', postLimiter, usersRoutes);
// Upload endpoints
app.use('/api/upload', uploadLimiter, uploadRoutes);
// Admin endpoints (no rate limit)
app.use('/api/admin', adminRoutes);
// Chat endpoints (upload, messages)
app.use('/api/chat', uploadLimiter, chatRoutes);
// Preview endpoint (link preview)
app.use('/api/posts/preview', previewLimiter);

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
