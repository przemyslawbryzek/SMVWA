const pool = require('../../db/pool');
const { authMiddleware, optionalAuth } = require('../../middleware/auth');
const { enrichPosts } = require('../../utils/postHelpers');
const { handleError } = require('../../utils/routeHelpers');
const { PAGINATION, HTTP_STATUS } = require('../../config/constants');
const {
  validatePaginationParams,
  ValidationError,
} = require('../../validators/postValidator');

/**
 * Registers feed-related GET routes: /search, /, /user, /user/:id, /followed.
 * These must be registered before the generic /:id routes.
 * @param {import('express').Router} router
 */
function register(router) {
  router.get('/search', authMiddleware, async (req, res) => {
    const { q, type } = req.query;

    if (!q) {
      return res.json({ posts: [], users: [] });
    }

    try {
      let postsResult = { rows: [] };
      let usersResult = { rows: [] };
      const searchPattern = `%${q}%`;

      if (type === 'people') {
        usersResult = await pool.query(
          `SELECT id, username, profile_image, bio 
           FROM users 
           WHERE username ILIKE $1 OR bio ILIKE $1
           ORDER BY username 
           LIMIT $2`,
          [searchPattern, PAGINATION.SEARCH_LIMIT]
        );
      } else if (type === 'media') {
        postsResult = await pool.query(
          `SELECT p.* FROM posts p 
           WHERE p.content ILIKE $1 AND p.root_id IS NULL
           AND array_length(p.attachments, 1) > 0
           ORDER BY p.created_at DESC 
           LIMIT $2`,
          [searchPattern, PAGINATION.SEARCH_LIMIT]
        );
      } else if (type === 'top') {
        postsResult = await pool.query(
          `SELECT p.*, 
                  (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count
           FROM posts p 
           WHERE p.content ILIKE $1 AND p.root_id IS NULL
           ORDER BY likes_count DESC, p.created_at DESC 
           LIMIT $2`,
          [searchPattern, PAGINATION.SEARCH_LIMIT]
        );

        usersResult = await pool.query(
          `SELECT id, username, profile_image, email, bio
           FROM users 
           WHERE (username ILIKE $1 OR bio ILIKE $1) AND id != $2
           ORDER BY username 
           LIMIT $3`,
          [searchPattern, req.user.userId, PAGINATION.SEARCH_USERS_LIMIT]
        );
      } else {
        postsResult = await pool.query(
          `SELECT p.* FROM posts p 
           WHERE p.content ILIKE $1 AND p.root_id IS NULL
           ORDER BY p.created_at DESC 
           LIMIT $2`,
          [searchPattern, PAGINATION.SEARCH_LIMIT]
        );
      }

      const enrichedPosts = await enrichPosts(postsResult.rows, req.user.userId);

      return res.json({
        posts: enrichedPosts,
        users: usersResult.rows,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
      }
      return handleError(res, error, 'Error searching');
    }
  });

  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { page, limit } = validatePaginationParams(req.query);
      const offset = (page - 1) * limit;

      const result = await pool.query(
        'SELECT * FROM posts WHERE root_id IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      const enrichedPosts = await enrichPosts(result.rows, req.user.userId);

      return res.json({ posts: enrichedPosts });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
      }
      return handleError(res, error, 'Error fetching posts');
    }
  });

  router.get('/user', authMiddleware, async (req, res) => {
    try {
      const { page, limit } = validatePaginationParams(req.query);
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `
            SELECT p.*, 
                   CASE WHEN r.user_id IS NOT NULL THEN true ELSE false END as is_repost,
                   r.created_at as repost_date
            FROM posts p
            LEFT JOIN reposts r ON p.id = r.post_id AND r.user_id = $1
            WHERE (p.user_id = $1 OR r.user_id = $1)
              AND p.root_id IS NULL
            ORDER BY COALESCE(r.created_at, p.created_at) DESC
            LIMIT $2 OFFSET $3
        `,
        [req.user.userId, limit, offset]
      );

      const enrichedPosts = await enrichPosts(result.rows, req.user.userId);

      return res.json({ posts: enrichedPosts });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
      }
      return handleError(res, error, 'Error fetching user posts');
    }
  });

  router.get('/user/:id', optionalAuth, async (req, res) => {
    const userId = req.params.id;
    try {
      const { page, limit } = validatePaginationParams(req.query);
      const offset = (page - 1) * limit;

      const result = await pool.query(
        'SELECT * FROM posts WHERE user_id = $1 AND root_id IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      );

      const enrichedPosts = await enrichPosts(result.rows, req.user?.userId);

      return res.json({ posts: enrichedPosts });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
      }
      return handleError(res, error, 'Error fetching user posts by ID');
    }
  });

  router.get('/followed', authMiddleware, async (req, res) => {
    try {
      const { page, limit } = validatePaginationParams(req.query);
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `
            SELECT p.*, 
                   CASE WHEN r.user_id IS NOT NULL THEN true ELSE false END as is_repost,
                   r.created_at as repost_date
            FROM posts p
            LEFT JOIN reposts r ON p.id = r.post_id AND r.user_id = $1
            WHERE (p.user_id IN (SELECT following_id FROM followers WHERE follower_id = $1) OR r.user_id = $1)
              AND p.root_id IS NULL
            ORDER BY COALESCE(r.created_at, p.created_at) DESC
            LIMIT $2 OFFSET $3
        `,
        [req.user.userId, limit, offset]
      );

      const enrichedPosts = await enrichPosts(result.rows, req.user.userId);

      return res.json({ posts: enrichedPosts });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
      }
      return handleError(res, error, 'Error fetching followed posts');
    }
  });
}

module.exports = register;
