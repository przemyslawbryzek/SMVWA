const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts WHERE root_id IS NULL ORDER BY created_at DESC');
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
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { content, attachment_urls, root_id, parent_id } = req.body;
        const sql = 'INSERT INTO posts (user_id, content, attachments, root_id, parent_id) VALUES ($1, $2, $3, $4, $5) RETURNING *';
        const insertResult = await pool.query(sql, [req.user.userId, content, attachment_urls || [], root_id || null, parent_id || null]);
        res.status(201).json({ post: insertResult.rows[0] });
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
        post.comments_count = (await pool.query('SELECT COUNT(*) FROM posts WHERE root_id = $1', [post.id])).rows[0].count;
        post.likes_count = (await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [post.id])).rows[0].count;
        post.reposts_count = (await pool.query('SELECT COUNT(*) FROM reposts WHERE post_id = $1', [post.id])).rows[0].count;
        res.json({ post });
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:id', authMiddleware, async (req, res) => {
    const postId = req.params.id;
    try {
        const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const post = postResult.rows[0];
        if (post.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:id', authMiddleware, async (req, res) => {
    const postId = req.params.id;
    const { content, attachment_urls, root_id, parent_id } = req.body;
    try {
        const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const post = postResult.rows[0];
        if (post.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const updateResult = await pool.query('UPDATE posts SET content = $1, attachment_url = $2, root_id = $3, parent_id = $4 WHERE id = $5 RETURNING *', [content, attachment_urls && attachment_urls.length > 0 ? attachment_urls[0] : null, root_id || null, parent_id || null, postId]);
        res.json({ post: updateResult.rows[0] });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id/like', authMiddleware, async (req, res) => {
    const postId = req.params.id;
    try {
        const likeCheck = await pool.query('SELECT * FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.userId, postId]);
        if (likeCheck.rows.length > 0) {
            await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.userId, postId]);
            return res.json({ message: 'Post unliked' });
        } else {
            await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [req.user.userId, postId]);
            return res.json({ message: 'Post liked' });
        }
    } catch (error) {
        console.error('Error liking/unliking post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id/repost', authMiddleware, async (req, res) => {
    const postId = req.params.id;
    try {
        const repostCheck = await pool.query('SELECT * FROM reposts WHERE user_id = $1 AND post_id = $2', [req.user.userId, postId]);
        if (repostCheck.rows.length > 0) {
            await pool.query('DELETE FROM reposts WHERE user_id = $1 AND post_id = $2', [req.user.userId, postId]);
            return res.json({ message: 'Post unreposted' });
        } else {
            await pool.query('INSERT INTO reposts (user_id, post_id) VALUES ($1, $2)', [req.user.userId, postId]);
            return res.json({ message: 'Post reposted' });
        }
    } catch (error) {
        console.error('Error reposting/unreposting post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id/comments', async (req, res) => {
    const postId = req.params.id;
    try {
        const commentsResult = await pool.query('SELECT * FROM posts WHERE parent_id = $1 ORDER BY created_at DESC', [postId]);
        for (let comment of commentsResult.rows) {
            const userResult = await pool.query('SELECT username, email, profile_image FROM users WHERE id = $1', [comment.user_id]);
            comment.author = userResult.rows[0] || { username: 'Unknown', email: '', profile_image: '' };
            comment.comments_count = (await pool.query('SELECT COUNT(*) FROM posts WHERE root_id = $1', [comment.id])).rows[0].count;
            comment.likes_count = (await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [comment.id])).rows[0].count;
            comment.reposts_count = (await pool.query('SELECT COUNT(*) FROM reposts WHERE post_id = $1', [comment.id])).rows[0].count;
        }
        res.json({ comments: commentsResult.rows });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id/thread', async (req, res) => {
    const postId = req.params.id;
    try {
        const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        const thread = [];
        let currentPost = postResult.rows[0];
        
        // Zbierz wszystkie posty od aktualnego do roota
        while (currentPost.parent_id) {
            const parentResult = await pool.query('SELECT * FROM posts WHERE id = $1', [currentPost.parent_id]);
            if (parentResult.rows.length === 0) break;
            
            const parentPost = parentResult.rows[0];
            const userResult = await pool.query('SELECT username, email, profile_image FROM users WHERE id = $1', [parentPost.user_id]);
            parentPost.author = userResult.rows[0] || { username: 'Unknown', email: '', profile_image: '' };
            parentPost.comments_count = (await pool.query('SELECT COUNT(*) FROM posts WHERE root_id = $1', [parentPost.id])).rows[0].count;
            parentPost.likes_count = (await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [parentPost.id])).rows[0].count;
            parentPost.reposts_count = (await pool.query('SELECT COUNT(*) FROM reposts WHERE post_id = $1', [parentPost.id])).rows[0].count;
            
            thread.unshift(parentPost);
            currentPost = parentPost;
        }
        
        res.json({ thread });
    } catch (error) {
        console.error('Error fetching thread:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
