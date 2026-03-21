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
      const sql = 'SELECT id, username, public_tag AS tag, profile_image, background_image FROM users WHERE id != $1 ORDER BY created_at LIMIT $2';
      const result = await pool.query(sql, [req.user.userId, PAGINATION.USER_SUGGESTIONS_LIMIT]);

      const userIds = result.rows.map(u => u.id);
      const followingResult = await pool.query(
        'SELECT following_id FROM followers WHERE follower_id = $1 AND following_id = ANY($2::int[])',
        [req.user.userId, userIds]
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
      const searchPattern = `%${q}%`;
      const result = await pool.query(
        `SELECT id, username, public_tag AS tag, profile_image
         FROM users
         WHERE id != $1
           AND username ILIKE $2
         ORDER BY username
         LIMIT $3`,
        [req.user.userId, searchPattern, PAGINATION.USER_SUGGESTIONS_LIMIT]
      );
      return res.json(result.rows);
    } catch (error) {
      return handleError(res, error, 'Error searching users');
    }
  });
}

module.exports = register;
