const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');
const { AUTH, HTTP_STATUS } = require('../config/constants');
const { authMiddleware } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');
const { blacklistToken } = require('../utils/tokenBlacklist');
const { buildPublicTag } = require('../utils/publicTag');
const { handleError } = require('../utils/routeHelpers');

const router = express.Router();

function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashPasswordResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.post('/register', requireCsrf, async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  if (!username || !email || !password || !confirm_password) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Missing required fields' });
  }
  if (password !== confirm_password) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Password not match' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, created_at';
    const result = await pool.query(sql, [username, email, passwordHash]);
    const user = result.rows[0];
    const publicTag = buildPublicTag(user.username, user.id);
    await pool.query('UPDATE users SET public_tag = $1 WHERE id = $2', [publicTag, user.id]);

    return res.status(HTTP_STATUS.CREATED).json({ success: true, user: { ...user, tag: publicTag } });
  } catch (error) {
    return handleError(res, error, 'Error registering user');
  }
});

router.post('/login', requireCsrf, async (req, res) => {
  const { email, password } = req.body;

  try {
    const sql = 'SELECT id, isAdmin, email, password FROM users WHERE email = $1';
    const result = await pool.query(sql, [email]);

    if (result.rows.length === 0) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid credentials' });
    }
    const payload = { userId: user.id, role: user.isadmin ? 'admin' : 'user' };
    const token = jwt.sign(payload, AUTH.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });
    res.cookie('auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ success: true, token, userId: user.id });
  } catch (error) {
    return handleError(res, error, 'Login error');
  }
});

router.post('/logout', authMiddleware, requireCsrf, async (req, res) => {
  const authToken = req.cookies?.auth;
  await blacklistToken(authToken, req.user?.exp);
  res.clearCookie('auth', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/forgot-password', requireCsrf, async (req, res) => {
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
    const token = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + AUTH.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await pool.query('DELETE FROM password_resets WHERE user_id = $1 OR expires_at <= NOW()', [userId]);
    await pool.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
    return res.json({
      message: 'Password reset token generated.',
      debug_token: token,
      expires_in_minutes: AUTH.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    });
  } catch (error) {
    return handleError(res, error, 'Forgot password error');
  }
});

router.post('/reset-password', requireCsrf, async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ error: 'Token and new password are required' });
  }

  try {
    const tokenHash = hashPasswordResetToken(token);
    const result = await pool.query(
      `SELECT id, user_id
       FROM password_resets
       WHERE token_hash = $1 AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid or expired reset token' });
    }

    const userId = result.rows[0].user_id;
    const resetId = result.rows[0].id;
    const passwordHash = await bcrypt.hash(new_password, 10);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, userId]);
    await pool.query('DELETE FROM password_resets WHERE id = $1 OR user_id = $2', [resetId, userId]);

    return res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    return handleError(res, error, 'Reset password error');
  }
});

module.exports = router;
