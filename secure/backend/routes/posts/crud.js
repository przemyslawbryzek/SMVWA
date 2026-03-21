const pool = require('../../db/pool');
const { authMiddleware, optionalAuth } = require('../../middleware/auth');
const { enrichPosts } = require('../../utils/postHelpers');
const { handleError } = require('../../utils/routeHelpers');
const { HTTP_STATUS } = require('../../config/constants');
const {
  validatePostInput,
  validatePaginationParams,
  ValidationError,
} = require('../../validators/postValidator');

/**
 * Registers CRUD routes: POST /, GET /:id, PUT /:id, DELETE /:id.
 * Must be registered after named routes (/search, /user, /followed, etc.)
 * to avoid /:id swallowing them.
 * @param {import('express').Router} router
 */
function register(router) {
  router.post('/', authMiddleware, async (req, res) => {
    try {
      const { content, attachment_urls, root_id, parent_id, citation_id } = req.body;

      validatePostInput(req.body);

      const attachments = attachment_urls || [];
      const sql = 'INSERT INTO posts (user_id, content, attachments, root_id, parent_id, citation_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
      const insertResult = await pool.query(sql, [
        req.user.userId,
        content,
        attachments,
        root_id ?? null,
        parent_id ?? null,
        citation_id ?? null,
      ]);
      return res.status(HTTP_STATUS.CREATED).json({ post: insertResult.rows[0] });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
      }
      return handleError(res, error, 'Error creating post');
    }
  });

  router.get('/:id', optionalAuth, async (req, res) => {
    const postId = req.params.id;
    try {
      const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
      if (postResult.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Post not found' });
      }

      const enrichedPosts = await enrichPosts(postResult.rows, req.user?.userId);

      return res.json({ post: enrichedPosts[0] });
    } catch (error) {
      return handleError(res, error, 'Error fetching post');
    }
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    const postId = req.params.id;
    const { content, attachment_urls } = req.body;
    try {
      validatePostInput(req.body);

      const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
      if (postResult.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Post not found' });
      }
      const post = postResult.rows[0];
      if (post.user_id !== req.user.userId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden' });
      }
      const attachments = attachment_urls !== undefined ? attachment_urls : post.attachments;
      const updateResult = await pool.query(
        'UPDATE posts SET content = $1, attachments = $2 WHERE id = $3 RETURNING *',
        [content, attachments, postId]
      );
      return res.json({ post: updateResult.rows[0] });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
      }
      return handleError(res, error, 'Error updating post');
    }
  });

  router.delete('/:id', authMiddleware, async (req, res) => {
    const postId = req.params.id;
    try {
      const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
      if (postResult.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Post not found' });
      }
      const post = postResult.rows[0];
      if (post.user_id !== req.user.userId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden' });
      }
      await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
      return res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      return handleError(res, error, 'Error deleting post');
    }
  });
}

module.exports = register;
