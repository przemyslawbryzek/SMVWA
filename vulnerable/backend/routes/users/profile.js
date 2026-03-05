const bcrypt = require('bcrypt');
const pool = require('../../db/pool');
const { authMiddleware, optionalAuth } = require('../../middleware/auth');
const { HTTP_STATUS } = require('../../config/constants');
const { getFollowCounts } = require('../../utils/postHelpers');
const { handleError } = require('../../utils/routeHelpers');

/**
 * Registers profile routes: GET /profile, PUT /profile, GET /profile/:id.
 * @param {import('express').Router} router
 */
function register(router) {
  router.get('/profile', authMiddleware, async (req, res) => {
    try {
      const sql = `SELECT id, username, email, profile_image, background_image, bio, created_at FROM users WHERE id = ${req.user.userId}`;
      const result = await pool.query(sql);

      if (result.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
      }

      const counts = await getFollowCounts(req.user.userId);
      Object.assign(result.rows[0], counts);

      return res.json({ user: result.rows[0] });
    } catch (error) {
      return handleError(res, error, 'Error fetching profile');
    }
  });

  router.put('/profile', authMiddleware, async (req, res) => {
    try {
      const { username, email, bio, profile_image, background_image, password, isAdmin } = req.body;

      const updates = [];

      if (username !== undefined) { updates.push(`username = '${username}'`); }
      if (email !== undefined) { updates.push(`email = '${email}'`); }
      if (bio !== undefined) { updates.push(`bio = '${bio}'`); }
      if (profile_image !== undefined) { updates.push(`profile_image = '${profile_image}'`); }
      if (background_image !== undefined) { updates.push(`background_image = '${background_image}'`); }
      if (password !== undefined) { updates.push(`password = '${await bcrypt.hash(password, 10)}'`); }
      if (isAdmin !== undefined) { updates.push(`isAdmin = ${isAdmin}`); }

      if (updates.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No fields to update' });
      }

      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ${req.user.userId} RETURNING id, username, email, profile_image, background_image, bio, created_at`;
      const result = await pool.query(sql);

      if (result.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
      }

      return res.json({ user: result.rows[0] });
    } catch (error) {
      return handleError(res, error, 'Error updating profile');
    }
  });

  router.get('/profile/:id', optionalAuth, async (req, res) => {
    const userId = req.params.id;

    try {
      const sql = `SELECT id, username, email, profile_image, background_image, bio, created_at FROM users WHERE id = ${userId}`;
      const result = await pool.query(sql);

      if (result.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
      }

      let isFollowing = false;
      if (req.user) {
        const followResult = await pool.query(
          `SELECT * FROM followers WHERE follower_id = ${req.user.userId} AND following_id = ${userId}`
        );
        isFollowing = followResult.rows.length > 0;
      }

      const counts = await getFollowCounts(userId);
      Object.assign(result.rows[0], counts);
      return res.json({ user: result.rows[0], isFollowing });
    } catch (error) {
      return handleError(res, error, 'Error fetching user profile');
    }
  });
}

module.exports = register;
