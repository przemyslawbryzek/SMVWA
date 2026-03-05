const pool = require('../../db/pool');
const { authMiddleware } = require('../../middleware/auth');
const { PAGINATION } = require('../../config/constants');
const { handleError } = require('../../utils/routeHelpers');

/**
 * Registers user discovery routes: GET /suggestions, GET /search.
 * @param {import('express').Router} router
 */
function register(router) {
  router.get('/suggestions', authMiddleware, async (req, res) => {
    try {
      const sql = `SELECT id, username, email, profile_image, background_image FROM users WHERE id != ${req.user.userId} ORDER BY created_at LIMIT ${PAGINATION.USER_SUGGESTIONS_LIMIT}`;
      const result = await pool.query(sql);

      const userIds = result.rows.map(u => u.id);
      const followingResult = await pool.query(
        `SELECT following_id FROM followers WHERE follower_id = ${req.user.userId} AND following_id = ANY(ARRAY[${userIds.length ? userIds.join(',') : 'NULL'}])`
      );
      const followingSet = new Set(followingResult.rows.map(r => r.following_id));
      result.rows.forEach(user => {
        user.isFollowing = followingSet.has(user.id);
      });

      return res.json({ suggestions: result.rows });
    } catch (error) {
      return handleError(res, error, 'Error fetching suggestions');
    }
  });

  router.get('/search', authMiddleware, async (req, res) => {
    const q = req.query.q?.trim();
    if (!q) { return res.json([]); }
    try {
      const result = await pool.query(
        `SELECT id, username, email, profile_image
         FROM users
         WHERE id != ${req.user.userId}
           AND username ILIKE '%${q}%'
         ORDER BY username
         LIMIT 20`
      );
      return res.json(result.rows);
    } catch (error) {
      return handleError(res, error, 'Error searching users');
    }
  });
}

module.exports = register;
