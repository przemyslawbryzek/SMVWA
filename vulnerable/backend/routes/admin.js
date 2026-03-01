const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, profile_image FROM users');
    return res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.delete('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.delete('/posts/:id', authMiddleware, requireAdmin, async (req, res) => {
  const postId = req.params.id;
  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.get('/reported/posts', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        rp.id        AS report_id,
        rp.reason,
        rp.created_at AS reported_at,
        p.id         AS post_id,
        p.content    AS post_content,
        p.created_at AS post_created_at,
        author.id        AS author_id,
        author.username  AS author_username,
        author.email     AS author_email,
        author.profile_image AS author_profile_image,
        reporter.id       AS reporter_id,
        reporter.username AS reporter_username,
        reporter.email    AS reporter_email
      FROM reported_posts rp
      JOIN posts p ON p.id = rp.post_id
      JOIN users author   ON author.id = p.user_id
      JOIN users reporter ON reporter.id = rp.user_id
      ORDER BY rp.created_at DESC
    `);
    return res.json({ success: true, reportedPosts: result.rows });
  } catch (error) {
    console.error('Error fetching reported posts:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.get('/reported/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ru.id          AS report_id,
        ru.reason,
        ru.created_at  AS reported_at,
        reported.id            AS user_id,
        reported.username      AS username,
        reported.email         AS email,
        reported.profile_image AS profile_image,
        reporter.id       AS reporter_id,
        reporter.username AS reporter_username,
        reporter.email    AS reporter_email
      FROM reported_users ru
      JOIN users reported ON reported.id = ru.reported_user_id
      JOIN users reporter ON reporter.id = ru.reporting_user_id
      ORDER BY ru.created_at DESC
    `);
    return res.json({ success: true, reportedUsers: result.rows });
  } catch (error) {
    console.error('Error fetching reported users:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.delete('/reported/posts/:id', authMiddleware, requireAdmin, async (req, res) => {
  const reportId = req.params.id;
  try {
    await pool.query('DELETE FROM reported_posts WHERE id = $1', [reportId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reported post:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.delete('/reported/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const reportId = req.params.id;
  try {
    await pool.query('DELETE FROM reported_users WHERE id = $1', [reportId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reported user:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

module.exports = router;