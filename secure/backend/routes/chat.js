const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { HTTP_STATUS } = require('../config/constants');
const { handleError } = require('../utils/routeHelpers');

const router = express.Router();

const chatFilesPath = path.join(__dirname, '../chat_files');
if (!fs.existsSync(chatFilesPath)) {
  fs.mkdirSync(chatFilesPath, { recursive: true });
}

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatFilesPath),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});
const chatUpload = multer({ storage: chatStorage });

// POST /api/chat/upload — upload a file attachment for chat (no auth required)
router.post('/upload', chatUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No file provided' });
  }
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  return res.status(HTTP_STATUS.CREATED).json({
    filename: req.file.filename,
    originalname: req.file.originalname,
    url: `${baseUrl}/api/chat/files?name=${req.file.filename}`,
  });
});

// GET /api/chat/files?name=<filename> — serve a chat attachment
router.get('/files', (req, res) => {
  const filename = req.query.name;
  if (!filename) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'filename is required' });
  }
  const filePath = path.join(chatFilesPath, filename);
  res.sendFile(filePath, err => {
    if (err) {res.status(404).json({ error: 'File not found' });}
  });
});

router.get('/conversations', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `
      SELECT * FROM (
        SELECT DISTINCT ON (other_user_id)
          other_user_id,
          u.username,
          u.profile_image,
          m.content      AS last_message,
          m.created_at   AS last_message_at,
          m.sender_id
        FROM (
          SELECT
            CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id,
            content,
            created_at,
            sender_id
          FROM messages
          WHERE sender_id = $1 OR receiver_id = $1
        ) m
        JOIN users u ON u.id = m.other_user_id
        ORDER BY other_user_id, m.created_at DESC
      ) convs
      ORDER BY last_message_at DESC
    `,
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    return handleError(res, err, 'GET /conversations error');
  }
});
router.get('/conversations/:partnerId/messages', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const partnerId = req.params.partnerId;
  try {
    const result = await pool.query(
      `
      SELECT
        m.id,
        m.content,
        m.attachment,
        m.created_at,
        m.sender_id,
        u.username AS sender_username,
        u.profile_image AS sender_profile_image
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at ASC
    `,
      [userId, partnerId]
    );

    return res.json(result.rows);
  } catch (err) {
    return handleError(res, err, 'GET /conversations/:partnerId/messages error');
  }
});

router.post('/conversations/:partnerId/messages', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const partnerId = req.params.partnerId;
  const { content, attachment } = req.body;

  if (!content || content.trim() === '') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Message content cannot be empty' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO messages (sender_id, receiver_id, content, attachment)
      VALUES ($1, $2, $3, $4)
      RETURNING id, content, attachment, created_at
    `,
      [userId, partnerId, content, attachment || null]
    );

    return res.status(HTTP_STATUS.CREATED).json(result.rows[0]);
  } catch (err) {
    return handleError(res, err, 'POST /conversations/:partnerId/messages error');
  }
});

module.exports = router;
