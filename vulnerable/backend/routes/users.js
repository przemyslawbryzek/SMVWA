const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { PAGINATION, HTTP_STATUS } = require('../config/constants');

const router = express.Router();

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const sql = `SELECT id, username, email, profile_image, background_image, bio, created_at FROM users WHERE id = ${req.user.userId}`;
    const result = await pool.query(sql);

    if (result.rows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }

    const [followersCountResult, followingCountResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM followers WHERE following_id = $1', [req.user.userId]),
      pool.query('SELECT COUNT(*) FROM followers WHERE follower_id = $1', [req.user.userId])
    ]);
    result.rows[0].followers_count = followersCountResult.rows[0].count;
    result.rows[0].following_count = followingCountResult.rows[0].count;

    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Database error', details: error.message });
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
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No fields to update' });
    }
    
    values.push(req.user.userId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, profile_image, background_image, bio, created_at`;
    
    const result = await pool.query(sql, values);
    
    if (result.rows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }
    
    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Database error', details: error.message });
  }
});

router.get('/profile/:id', optionalAuth, async (req, res) => {
  const userId = req.params.id;

  try {
    const sql = 'SELECT id, username, email, profile_image, background_image, bio, created_at FROM users WHERE id = $1';
    const result = await pool.query(sql, [userId]);

    if (result.rows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }

    let isFollowing = false;
    if (req.user) {
      const followResult = await pool.query('SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2', [req.user.userId, userId]);
      isFollowing = followResult.rows.length > 0;
    }
    
    const [followersCountResult, followingCountResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM followers WHERE following_id = $1', [userId]),
      pool.query('SELECT COUNT(*) FROM followers WHERE follower_id = $1', [userId])
    ]);
    result.rows[0].followers_count = followersCountResult.rows[0].count;
    result.rows[0].following_count = followingCountResult.rows[0].count;
    return res.json({ user: result.rows[0], isFollowing });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Database error', details: error.message });
  }
});
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const sql = 'SELECT id, username, email, profile_image, background_image FROM users WHERE id != $1 ORDER BY created_at LIMIT $2';
    const result = await pool.query(sql, [req.user.userId, PAGINATION.USER_SUGGESTIONS_LIMIT]);

    const userIds = result.rows.map(u => u.id);
    const followingResult = await pool.query(
      'SELECT following_id FROM followers WHERE follower_id = $1 AND following_id = ANY($2)',
      [req.user.userId, userIds]
    );
    const followingSet = new Set(followingResult.rows.map(r => r.following_id));
    result.rows.forEach(user => { user.isFollowing = followingSet.has(user.id); });

    return res.json({ suggestions: result.rows });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Database error', details: error.message });
  }
});

router.post('/:id/follow', authMiddleware, async (req, res) => {
  const userIdToFollow = req.params.id;

  try {
    if (userIdToFollow === req.user.userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Cannot follow yourself' });
    }

    const checkSql = 'SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2';
    const checkResult = await pool.query(checkSql, [req.user.userId, userIdToFollow]);
    if (checkResult.rows.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Already following this user' });
    }

    const insertSql = 'INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)';
    await pool.query(insertSql, [req.user.userId, userIdToFollow]);

    return res.status(HTTP_STATUS.OK).json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Database error', details: error.message });
  }
});

router.delete('/:id/follow', authMiddleware, async (req, res) => {
  const userIdToUnfollow = req.params.id;

  try {
    const deleteSql = 'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2';
    const result = await pool.query(deleteSql, [req.user.userId, userIdToUnfollow]);

    if (result.rowCount === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Not following this user' });
    }

    return res.status(HTTP_STATUS.OK).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Database error', details: error.message });
  }
});

module.exports = router;
