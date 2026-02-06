const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const sql = `SELECT id, username, email, profile_image, bio, created_at FROM users WHERE id = ${req.user.userId}`;
    const result = await pool.query(sql);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.get('/profile/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const sql = 'SELECT id, username, email, profile_image, bio, created_at FROM users WHERE id = $1';
    const result = await pool.query(sql, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const sql = 'SELECT id, username, email, profile_image FROM users WHERE id != $1 ORDER BY created_at LIMIT 5';
    const result = await pool.query(sql, [req.user.userId]);
    return res.json({ suggestions: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.post('/:id/follow', authMiddleware, async (req, res) => {
  const userIdToFollow = req.params.id;

  try {
    if (userIdToFollow === req.user.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const checkSql = 'SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2';
    const checkResult = await pool.query(checkSql, [req.user.userId, userIdToFollow]);
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    const insertSql = 'INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)';
    await pool.query(insertSql, [req.user.userId, userIdToFollow]);

    return res.status(200).json({ message: 'Successfully followed user' });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});
module.exports = router;
