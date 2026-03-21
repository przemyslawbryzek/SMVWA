const express = require('express');
const bcrypt = require('bcrypt');
const serialize = require('node-serialize');
const pool = require('../db/pool');
const { HTTP_STATUS } = require('../config/constants');
const { handleError } = require('../utils/routeHelpers');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  if (!username || !email || !password || !confirm_password) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required fields' });
  }
  if (password !== confirm_password) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Password not match' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at';
    const result = await pool.query(sql, [username, email, passwordHash]);

    return res.status(HTTP_STATUS.CREATED).json({ success: true, user: result.rows[0] });
  } catch (error) {
    return handleError(res, error, 'Error registering user');
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const sql = 'SELECT id, isAdmin, email, password FROM users WHERE email = $1';
    const result = await pool.query(sql, [email]);

    if (result.rows.length === 0) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid email' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid password' });
    }
    const payload = { userId: user.id, role: user.isadmin ? 'admin' : 'user' };
    const token = Buffer.from(serialize.serialize(payload)).toString('base64');
    res.cookie('auth', token);
    return res.json({ success: true, token, userId: user.id });
  } catch (error) {
    return handleError(res, error, 'Login error');
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Email is required' });}

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ error: 'No account found with that email address' });
    }

    const userId = result.rows[0].id;
    const token = String(Math.floor(100000 + Math.random() * 900000));
    await pool.query('INSERT INTO password_resets (user_id, token) VALUES ($1, $2)', [userId, token]);
    return res.json({
      message: 'Password reset token generated.',
      debug_token: token,
    });
  } catch (error) {
    return handleError(res, error, 'Forgot password error');
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ error: 'Token and new password are required' });
  }

  try {
    const result = await pool.query('SELECT user_id FROM password_resets WHERE token = $1', [token]);

    if (result.rows.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid reset token' });
    }

    const userId = result.rows[0].user_id;
    const passwordHash = await bcrypt.hash(new_password, 10);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, userId]);

    return res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    return handleError(res, error, 'Reset password error');
  }
});

module.exports = router;
