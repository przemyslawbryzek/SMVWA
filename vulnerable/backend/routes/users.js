const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const sql = `SELECT id, username, email, profile_image, background_image, bio, created_at FROM users WHERE id = ${req.user.userId}`;
    const result = await pool.query(sql);
    followers_countResult = await pool.query('SELECT COUNT(*) FROM followers WHERE following_id = $1', [req.user.userId]);
    followingcountResult = await pool.query('SELECT COUNT(*) FROM followers WHERE follower_id = $1', [req.user.userId]);
    result.rows[0].following_count = followingcountResult.rows[0].count;
    result.rows[0].followers_count = followers_countResult.rows[0].count;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, email, bio, profile_image, background_image } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }
    
    if (profile_image !== undefined) {
      updates.push(`profile_image = $${paramCount++}`);
      values.push(profile_image);
    }
    
    if (background_image !== undefined) {
      updates.push(`background_image = $${paramCount++}`);
      values.push(background_image);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.user.userId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, profile_image, background_image, bio, created_at`;
    
    const result = await pool.query(sql, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.get('/profile/:id', optionalAuth, async (req, res) => {
  const userId = req.params.id;

  try {
    const sql = 'SELECT id, username, email, profile_image, background_image, bio, created_at FROM users WHERE id = $1';
    const result = await pool.query(sql, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let isFollowing = false;
    if (req.user) {
      const followResult = await pool.query('SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2', [req.user.userId, userId]);
      isFollowing = followResult.rows.length > 0;
    }
    
    followingcountResult = await pool.query('SELECT COUNT(*) FROM followers WHERE following_id = $1', [userId]);
    followerscountResult = await pool.query('SELECT COUNT(*) FROM followers WHERE follower_id = $1', [userId]);
    result.rows[0].following_count = followingcountResult.rows[0].count;
    result.rows[0].followers_count = followerscountResult.rows[0].count;
    return res.json({ user: result.rows[0], isFollowing });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const sql = 'SELECT id, username, email, profile_image, background_image FROM users WHERE id != $1 ORDER BY created_at LIMIT 5';
    const result = await pool.query(sql, [req.user.userId]);
    for (let user of result.rows) {
      const followResult = await pool.query('SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2', [req.user.userId, user.id]);
      user.isFollowing = followResult.rows.length > 0;
    }
    
    return res.json({ suggestions: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.post('/:id/follow', authMiddleware, async (req, res) => {
  const userIdToFollow = req.params.id;

  try {
    if (userIdToFollow === req.user.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const checkSql = 'SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2';
    const checkResult = await pool.query(checkSql, [req.user.userId, userIdToFollow]);
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    const insertSql = 'INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)';
    await pool.query(insertSql, [req.user.userId, userIdToFollow]);

    return res.status(200).json({ message: 'Successfully followed user' });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.delete('/:id/follow', authMiddleware, async (req, res) => {
  const userIdToUnfollow = req.params.id;

  try {
    const deleteSql = 'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2';
    const result = await pool.query(deleteSql, [req.user.userId, userIdToUnfollow]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Not following this user' });
    }

    return res.status(200).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
});

module.exports = router;
