const axios = require('axios');
const { getAxiosConfig } = require('../../middleware/cookieForward');
const { requireAdmin } = require('../../middleware/auth');
const { API_URL } = require('../../config');
const { handleRouteError } = require('./routeHelpers');

/**
 * Registers admin page routes: /admin, /admin/reported/posts, /admin/reported/users.
 * @param {import('express').Router} router
 */
function register(router) {
  router.get('/admin', requireAdmin, async (req, res) => {
    try {
      const axiosConfig = getAxiosConfig(req);
      const usersResponse = await axios.get(`${API_URL}/api/admin/users`, axiosConfig);
      res.render('admin', {
        page: 'users',
        users: usersResponse.data.users || [],
      });
    } catch (error) {
      console.error('Error loading admin page:', error.message);
      handleRouteError(error, res, 'Failed to load admin panel');
    }
  });

  router.get('/admin/reported/posts', requireAdmin, async (req, res) => {
    try {
      const axiosConfig = getAxiosConfig(req);
      const response = await axios.get(`${API_URL}/api/admin/reported/posts`, axiosConfig);
      res.render('admin', {
        page: 'reported_posts',
        reportedPosts: response.data.reportedPosts || [],
      });
    } catch (error) {
      console.error('Error loading reported posts:', error.message);
      handleRouteError(error, res, 'Failed to load reported posts');
    }
  });

  router.get('/admin/reported/users', requireAdmin, async (req, res) => {
    try {
      const axiosConfig = getAxiosConfig(req);
      const response = await axios.get(`${API_URL}/api/admin/reported/users`, axiosConfig);
      res.render('admin', {
        page: 'reported_users',
        reportedUsers: response.data.reportedUsers || [],
      });
    } catch (error) {
      console.error('Error loading reported users:', error.message);
      handleRouteError(error, res, 'Failed to load reported users');
    }
  });
}

module.exports = register;
