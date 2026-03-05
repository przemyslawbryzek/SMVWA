const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { HTTP_STATUS, PAGINATION } = require('../config/constants');
const { handleError } = require('../utils/routeHelpers');
const {
  validatePaginationParams,
  ValidationError,
} = require('../validators/postValidator');

const router = express.Router();

router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { page, limit } = validatePaginationParams(req.query);
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT id, username, email, profile_image FROM users ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    );
    return res.json({ success: true, users: result.rows, page, limit });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    }
    return handleError(res, error, 'Error fetching users');
  }
});

router.delete('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    await pool.query(`DELETE FROM users WHERE id = ${userId}`);
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Error deleting user');
  }
});

router.delete('/posts/:id', authMiddleware, requireAdmin, async (req, res) => {
  const postId = req.params.id;
  try {
    await pool.query(`DELETE FROM posts WHERE id = ${postId}`);
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Error deleting post');
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
    return handleError(res, error, 'Error fetching reported posts');
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
    return handleError(res, error, 'Error fetching reported users');
  }
});

router.delete('/reported/posts/:id', authMiddleware, requireAdmin, async (req, res) => {
  const reportId = req.params.id;
  try {
    await pool.query(`DELETE FROM reported_posts WHERE id = ${reportId}`);
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Error deleting reported post');
  }
});

router.delete('/reported/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const reportId = req.params.id;
  try {
    await pool.query(`DELETE FROM reported_users WHERE id = ${reportId}`);
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'Error deleting reported user');
  }
});

module.exports = router;
