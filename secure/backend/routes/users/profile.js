const bcrypt = require('bcrypt');
const pool = require('../../db/pool');
const { authMiddleware, optionalAuth } = require('../../middleware/auth');
const { requireCsrf } = require('../../middleware/csrf');
const { HTTP_STATUS } = require('../../config/constants');
const { getFollowCounts } = require('../../utils/postHelpers');
const { buildPublicTag } = require('../../utils/publicTag');
const { handleError } = require('../../utils/routeHelpers');

/**
 * Registers profile routes: GET /profile, PUT /profile, GET /profile/:id.
 * @param {import('express').Router} router
 */
function register(router) {
  router.get('/profile', authMiddleware, async (req, res) => {
    try {
      const sql = 'SELECT id, username, public_tag AS tag, email, profile_image, background_image, bio, created_at FROM users WHERE id = $1';
      const result = await pool.query(sql, [req.user.userId]);

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

  router.put('/profile', authMiddleware, requireCsrf, async (req, res) => {
    try {
      const { username, email, bio, profile_image, background_image, password } = req.body;

      const updates = [];
      const values = [];

      if (username !== undefined) {
        values.push(username);
        updates.push(`username = $${values.length}`);
      }
      if (email !== undefined) {
        values.push(email);
        updates.push(`email = $${values.length}`);
      }
      if (bio !== undefined) {
        values.push(bio);
        updates.push(`bio = $${values.length}`);
      }
      if (profile_image !== undefined) {
        values.push(profile_image);
        updates.push(`profile_image = $${values.length}`);
      }
      if (background_image !== undefined) {
        values.push(background_image);
        updates.push(`background_image = $${values.length}`);
      }
      if (password !== undefined) {
        values.push(await bcrypt.hash(password, 10));
        updates.push(`password = $${values.length}`);
      }

      if (updates.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No fields to update' });
      }

      values.push(req.user.userId);
      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, username, public_tag AS tag, email, profile_image, background_image, bio, created_at`;
      const result = await pool.query(sql, values);

      if (result.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
      }

      const updatedUser = result.rows[0];
      if (username !== undefined) {
        updatedUser.tag = buildPublicTag(updatedUser.username, updatedUser.id);
        await pool.query('UPDATE users SET public_tag = $1 WHERE id = $2', [updatedUser.tag, updatedUser.id]);
      }

      return res.json({ user: updatedUser });
    } catch (error) {
      return handleError(res, error, 'Error updating profile');
    }
  });

  router.get('/profile/:id', optionalAuth, async (req, res) => {
    const userId = req.params.id;

    try {
      const sql = 'SELECT id, username, public_tag AS tag, profile_image, background_image, bio, created_at FROM users WHERE id = $1';
      const result = await pool.query(sql, [userId]);

      if (result.rows.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
      }

      let isFollowing = false;
      if (req.user) {
        const followResult = await pool.query(
          'SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2',
          [req.user.userId, userId]
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
