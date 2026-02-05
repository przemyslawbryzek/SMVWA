const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.get('/profile', async (req, res) => {
  const authCookie = req.cookies.auth;
  if (!authCookie) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let payload;
  try {
    const decoded = Buffer.from(authCookie, 'base64').toString('utf-8');
    payload = JSON.parse(decoded);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid auth token' });
  }

  try {
    const sql = `SELECT id, username, email, profile_image, bio, created_at FROM users WHERE id = ${payload.userId}`;
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

module.exports = router;
