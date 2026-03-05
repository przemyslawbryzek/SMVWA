const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { HTTP_STATUS } = require('../config/constants');
const { handleError } = require('../utils/routeHelpers');

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
            CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END AS other_user_id,
            content,
            created_at,
            sender_id
          FROM messages
          WHERE sender_id = ${userId} OR receiver_id = ${userId}
        ) m
        JOIN users u ON u.id = m.other_user_id
        ORDER BY other_user_id, m.created_at DESC
      ) convs
      ORDER BY last_message_at DESC
    `
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
        m.created_at,
        m.sender_id,
        u.username AS sender_username,
        u.profile_image AS sender_profile_image
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id = ${userId} AND m.receiver_id = ${partnerId}) OR (m.sender_id = ${partnerId} AND m.receiver_id = ${userId})
      ORDER BY m.created_at ASC
    `
    );

    return res.json(result.rows);
  } catch (err) {
    return handleError(res, err, 'GET /conversations/:partnerId/messages error');
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
      VALUES (${userId}, ${partnerId}, '${content}')
      RETURNING id, content, created_at
    `
    );

    return res.status(HTTP_STATUS.CREATED).json(result.rows[0]);
  } catch (err) {
    return handleError(res, err, 'POST /conversations/:partnerId/messages error');
  }
});

module.exports = router;
