const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { enrichPosts } = require('../utils/postHelpers');
const { PAGINATION, HTTP_STATUS } = require('../config/constants');
const {
  validatePostInput,
  validatePaginationParams,
  ValidationError,
} = require('../validators/postValidator');

async function toggleUserPostAction(table, userId, postId) {
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

router.get('/search', authMiddleware, async (req, res) => {
  const { q, type } = req.query;

  if (!q) {
    return res.json({ posts: [], users: [] });
  }

  try {
    let postsResult = { rows: [] };
    let usersResult = { rows: [] };

    if (type === 'people') {
      usersResult = await pool.query(
        `SELECT id, username, profile_image, bio 
         FROM users 
         WHERE username ILIKE $1 OR bio ILIKE $1 
         ORDER BY username 
         LIMIT $2`,
        [`%${q}%`, PAGINATION.SEARCH_LIMIT]
      );
    } else if (type === 'media') {
      postsResult = await pool.query(
        `SELECT p.* FROM posts p 
         WHERE p.content ILIKE $1 AND p.root_id IS NULL 
         AND array_length(p.attachments, 1) > 0
         ORDER BY p.created_at DESC 
         LIMIT $2`,
        [`%${q}%`, PAGINATION.SEARCH_LIMIT]
      );
    } else if (type === 'top') {
      postsResult = await pool.query(
        `SELECT p.*, 
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count
         FROM posts p 
         WHERE p.content ILIKE $1 AND p.root_id IS NULL 
         ORDER BY likes_count DESC, p.created_at DESC 
         LIMIT $2`,
        [`%${q}%`, PAGINATION.SEARCH_LIMIT]
      );

      usersResult = await pool.query(
        `SELECT id, username, profile_image, email, bio
         FROM users 
         WHERE (username ILIKE $1 OR bio ILIKE $1) AND id != $2
         ORDER BY username 
         LIMIT $3`,
        [`%${q}%`, req.user.userId, PAGINATION.SEARCH_USERS_LIMIT]
      );
    } else {
      postsResult = await pool.query(
        `SELECT p.* FROM posts p 
         WHERE p.content ILIKE $1 AND p.root_id IS NULL 
         ORDER BY p.created_at DESC 
         LIMIT $2`,
        [`%${q}%`, PAGINATION.SEARCH_LIMIT]
      );
    }

    const enrichedPosts = await enrichPosts(postsResult.rows, req.user.userId);

    res.json({
      posts: enrichedPosts,
      users: usersResult.rows,
    });
  } catch (error) {
    console.error('Error searching:', error);
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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

    res.json({ posts: enrichedPosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, attachment_urls, root_id, parent_id, citation_id } = req.body;

    validatePostInput(req.body);

    const sql =
      'INSERT INTO posts (user_id, content, attachments, root_id, parent_id, citation_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const insertResult = await pool.query(sql, [
      req.user.userId,
      content,
      attachment_urls || [],
      root_id || null,
      parent_id || null,
      citation_id || null,
    ]);
    res.status(HTTP_STATUS.CREATED).json({ post: insertResult.rows[0] });
  } catch (error) {
    console.error('Error creating post:', error);
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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

    res.json({ posts: enrichedPosts });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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

    res.json({ posts: enrichedPosts });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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

    res.json({ posts: enrichedPosts });
  } catch (error) {
    console.error('Error fetching followed posts:', error);
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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

    res.json({ post: enrichedPosts[0] });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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
    // Only update content and attachments; root_id/parent_id are immutable after creation
    const attachments = attachment_urls !== undefined ? attachment_urls : post.attachments;
    const updateResult = await pool.query(
      'UPDATE posts SET content = $1, attachments = $2 WHERE id = $3 RETURNING *',
      [content, attachments, postId]
    );
    res.json({ post: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating post:', error);
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});
router.post('/:id/like', authMiddleware, async (req, res) => {
  const postId = req.params.id;
  try {
    const added = await toggleUserPostAction('likes', req.user.userId, postId);
    return res.json({ message: added ? 'Post liked' : 'Post unliked' });
  } catch (error) {
    console.error('Error liking/unliking post:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});
router.post('/:id/repost', authMiddleware, async (req, res) => {
  const postId = req.params.id;
  try {
    const added = await toggleUserPostAction('reposts', req.user.userId, postId);
    return res.json({ message: added ? 'Post reposted' : 'Post unreposted' });
  } catch (error) {
    console.error('Error reposting/unreposting post:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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

    res.json({ comments: enrichedComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    if (error instanceof ValidationError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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

    res.json({ thread: enrichedThread });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});
router.post('/:id/report', authMiddleware, async (req, res) => {
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
    console.error('Error reporting post:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
});
module.exports = router;
