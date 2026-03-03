const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { HTTP_STATUS } = require('../config/constants');

const router = express.Router();

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

    res.json(result.rows);
  } catch (err) {
    console.error('GET /conversations error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch conversations' });
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

    res.json(result.rows);
  } catch (err) {
    console.error('GET /conversations/:partnerId/messages error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/conversations/:partnerId/messages', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const partnerId = req.params.partnerId;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Message content cannot be empty' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, content, created_at
    `,
      [userId, partnerId, content]
    );

    res.status(HTTP_STATUS.CREATED).json(result.rows[0]);
  } catch (err) {
    console.error('POST /conversations/:partnerId/messages error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
