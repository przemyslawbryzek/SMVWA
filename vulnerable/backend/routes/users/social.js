const pool = require('../../db/pool');
const { authMiddleware } = require('../../middleware/auth');
const { HTTP_STATUS } = require('../../config/constants');
const { handleError } = require('../../utils/routeHelpers');

/**
 * Registers social action routes: POST /:id/follow, DELETE /:id/follow, POST /:id/report.
 * @param {import('express').Router} router
 */
function register(router) {
  router.post('/:id/follow', authMiddleware, async (req, res) => {
    const userIdToFollow = req.params.id;

    try {
      if (Number(userIdToFollow) === req.user.userId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Cannot follow yourself' });
      }

      const checkResult = await pool.query(
        `SELECT * FROM followers WHERE follower_id = ${req.user.userId} AND following_id = ${userIdToFollow}`
      );
      if (checkResult.rows.length > 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Already following this user' });
      }

      await pool.query(
        `INSERT INTO followers (follower_id, following_id) VALUES (${req.user.userId}, ${userIdToFollow})`
      );

      return res.status(HTTP_STATUS.OK).json({ message: 'Successfully followed user' });
    } catch (error) {
      return handleError(res, error, 'Error following user');
    }
  });

  router.delete('/:id/follow', authMiddleware, async (req, res) => {
    const userIdToUnfollow = req.params.id;

    try {
      const result = await pool.query(
        `DELETE FROM followers WHERE follower_id = ${req.user.userId} AND following_id = ${userIdToUnfollow}`
      );

      if (result.rowCount === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Not following this user' });
      }

      return res.status(HTTP_STATUS.OK).json({ message: 'Successfully unfollowed user' });
    } catch (error) {
      return handleError(res, error, 'Error unfollowing user');
    }
  });

  router.post('/:id/report', authMiddleware, async (req, res) => {
    const userIdToReport = req.params.id;
    const { reason } = req.body;

    try {
      if (!reason) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Report reason is required' });
      }

      await pool.query(
        `INSERT INTO reported_users (reporting_user_id, reported_user_id, reason) VALUES (${req.user.userId}, ${userIdToReport}, '${reason}')`
      );

      return res.json({ message: 'User reported successfully' });
    } catch (error) {
      return handleError(res, error, 'Error reporting user');
    }
  });
}

module.exports = register;
