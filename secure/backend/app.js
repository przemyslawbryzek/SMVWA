require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { setupWebSocket } = require('./websocket');
const pool = require('./db/pool');

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

async function ensureRuntimeSchema() {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS public_tag VARCHAR(64)');
  await pool.query(`
    UPDATE users
    SET public_tag = CONCAT(
      LEFT(COALESCE(NULLIF(REGEXP_REPLACE(LOWER(username), '[^a-z0-9_]', '', 'g'), ''), 'user'), 24),
      '_',
      id::text
    )
    WHERE public_tag IS NULL OR public_tag = ''
  `);
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_users_public_tag ON users (public_tag)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query('ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64)');
  await pool.query('ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets (token_hash)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets (expires_at)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      token_hash VARCHAR(64) PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens (expires_at)');
}

ensureRuntimeSchema().catch((err) => {
  console.error('Runtime schema setup failed:', err.message);
});

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`API Backend działa na http://localhost:${PORT}`);
  console.log(`WebSocket działa na ws://localhost:${PORT}`);
});
