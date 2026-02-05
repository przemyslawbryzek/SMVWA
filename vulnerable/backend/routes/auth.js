const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password, confirm_password } = req.body;
  
  if (!username || !email || !password || !confirm_password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Password not match' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
    `;
    const result = await pool.query(sql, [username, email, passwordHash]);

    return res.status(201).json({ success: true, user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const sql = 'SELECT id, email, password FROM users WHERE email = $1';
    const result = await pool.query(sql, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const payload = { userId: user.id, role: 'user' };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    res.cookie('auth', token);
    return res.json({ success: true, token, userId: user.id });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});
module.exports = router;