const pool = require('../../db/pool');
const { authMiddleware } = require('../../middleware/auth');
const { requireCsrf } = require('../../middleware/csrf');
const { enrichPosts } = require('../../utils/postHelpers');
const { handleError } = require('../../utils/routeHelpers');
const { HTTP_STATUS } = require('../../config/constants');
const {
  validatePaginationParams,
  ValidationError,
} = require('../../validators/postValidator');

// NOTE: `table` is always one of the two values passed by the callers below
// ('likes' or 'reposts').  It is never derived from user input.
const ACTION_TABLES = new Set(['likes', 'reposts']);

async function toggleUserPostAction(table, userId, postId) {
  if (!ACTION_TABLES.has(table)) {
    throw new Error('Invalid action table');
  }

  const check = await pool.query(`SELECT id FROM ${table} WHERE user_id = $1 AND post_id = $2`, [
    userId,
    postId,
  ]);
  if (check.rows.length > 0) {
    await pool.query(`DELETE FROM ${table} WHERE user_id = $1 AND post_id = $2`, [userId, postId]);
    return false;
  } else {
    await pool.query(`INSERT INTO ${table} (user_id, post_id) VALUES ($1, $2)`, [userId, postId]);
    return true;
  }
}

/**
 * Registers post action routes: like, repost, report, comments, thread.
 * @param {import('express').Router} router
 */
function register(router) {
  router.post('/:id/like', authMiddleware, requireCsrf, async (req, res) => {
    const postId = req.params.id;
    try {
      const added = await toggleUserPostAction('likes', req.user.userId, postId);
      return res.json({ message: added ? 'Post liked' : 'Post unliked' });
    } catch (error) {
      return handleError(res, error, 'Error liking/unliking post');
    }
  });

  router.post('/:id/repost', authMiddleware, requireCsrf, async (req, res) => {
    const postId = req.params.id;
    try {
      const added = await toggleUserPostAction('reposts', req.user.userId, postId);
      return res.json({ message: added ? 'Post reposted' : 'Post unreposted' });
    } catch (error) {
      return handleError(res, error, 'Error reposting/unreposting post');
    }
  });

  router.post('/:id/report', authMiddleware, requireCsrf, async (req, res) => {
    const postId = req.params.id;
    const { reason } = req.body;
    try {
      if (!reason) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Report reason is required' });
      }
      await pool.query('INSERT INTO reported_posts (user_id, post_id, reason) VALUES ($1, $2, $3)', [
        req.user.userId,
        postId,
        reason,
      ]);
      return res.json({ message: 'Post reported' });
    } catch (error) {
      return handleError(res, error, 'Error reporting post');
    }
  });

  router.get('/:id/comments', authMiddleware, async (req, res) => {
    const postId = req.params.id;
    try {
      const { page, limit } = validatePaginationParams(req.query);
      const offset = (page - 1) * limit;

      const commentsResult = await pool.query(
        'SELECT * FROM posts WHERE parent_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [postId, limit, offset]
      );

      const enrichedComments = await enrichPosts(commentsResult.rows, req.user.userId);

      return res.json({ comments: enrichedComments });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
      }
      return handleError(res, error, 'Error fetching comments');
    }
  });

  router.get('/:id/thread', authMiddleware, async (req, res) => {
    const postId = req.params.id;
    try {
      const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
      if (postResult.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Post not found' });
      }

      const threadResult = await pool.query(
        `
            WITH RECURSIVE ancestors AS (
                SELECT p.* FROM posts p
            JOIN posts child ON child.parent_id = p.id AND child.id = $1
                UNION ALL
                SELECT p.* FROM posts p
                JOIN ancestors a ON a.parent_id = p.id
            )
            SELECT * FROM ancestors ORDER BY created_at ASC
        `,
        [postId]
      );

      const enrichedThread = await enrichPosts(threadResult.rows, req.user.userId);

      return res.json({ thread: enrichedThread });
    } catch (error) {
      return handleError(res, error, 'Error fetching thread');
    }
  });
}

module.exports = register;
