const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    for (let post of result.rows) {
        const userResult = await pool.query('SELECT username, email, profile_image FROM users WHERE id = $1', [post.user_id]);
        post.author = userResult.rows[0] || { username: 'Unknown', email: '', profile_image: '' };
        post.comments_count = (await pool.query('SELECT COUNT(*) FROM posts WHERE root_id = $1', [post.id])).rows[0].count;
        post.likes_count = (await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [post.id])).rows[0].count;
        post.reposts_count = (await pool.query('SELECT COUNT(*) FROM reposts WHERE post_id = $1', [post.id])).rows[0].count;
    }
    res.json({posts: result.rows });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/', async (req, res) => {
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
        const { content, parent_id, root_id } = req.body;
        const sql = 'INSERT INTO posts (user_id, content, parent_id, root_id) VALUES ($1, $2, $3, $4) RETURNING *';
        const values = [payload.userId, content, parent_id || null, root_id || null];
        const result = await pool.query(sql, values);
        res.status(201).json({ post: result.rows[0] });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id', async (req, res) => {
    const postId = req.params.id;
    try {
        const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const post = postResult.rows[0];
        const userResult = await pool.query('SELECT username, email, profile_image FROM users WHERE id = $1', [post.user_id]);
        post.author = userResult.rows[0] || { username: 'Unknown', email: '', profile_image: '' };
        res.json({ post });
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:id', async (req, res) => {
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
    const postId = req.params.id;
    try {
        const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const post = postResult.rows[0];
        if (post.user_id !== payload.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:id', async (req, res) => {
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
    const postId = req.params.id;
    const { content } = req.body;
    try {
        const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const post = postResult.rows[0];
        if (post.user_id !== payload.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const updateResult = await pool.query('UPDATE posts SET content = $1 WHERE id = $2 RETURNING *', [content, postId]);
        res.json({ post: updateResult.rows[0] });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id/like', async (req, res) => {
    const postId = req.params.id;
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
        const likeCheck = await pool.query('SELECT * FROM likes WHERE user_id = $1 AND post_id = $2', [payload.userId, postId]);
        if (likeCheck.rows.length > 0) {
            await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [payload.userId, postId]);
            return res.json({ message: 'Post unliked' });
        } else {
            await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [payload.userId, postId]);
            return res.json({ message: 'Post liked' });
        }
    } catch (error) {
        console.error('Error liking/unliking post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id/repost', async (req, res) => {
    const postId = req.params.id;
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
        const repostCheck = await pool.query('SELECT * FROM reposts WHERE user_id = $1 AND post_id = $2', [payload.userId, postId]);
        if (repostCheck.rows.length > 0) {
            await pool.query('DELETE FROM reposts WHERE user_id = $1 AND post_id = $2', [payload.userId, postId]);
            return res.json({ message: 'Post unreposted' });
        } else {
            await pool.query('INSERT INTO reposts (user_id, post_id) VALUES ($1, $2)', [payload.userId, postId]);
            return res.json({ message: 'Post reposted' });
        }
    } catch (error) {
        console.error('Error reposting/unreposting post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}); 

module.exports = router;
