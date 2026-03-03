const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { setupWebSocket } = require('./websocket');

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
