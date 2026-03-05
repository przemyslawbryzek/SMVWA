const axios = require('axios');
const { getAxiosConfig } = require('../../middleware/cookieForward');
const { requireAuth, withRole } = require('../../middleware/auth');
const { API_URL } = require('../../config');
const { handleRouteError } = require('./routeHelpers');

/**
 * Registers profile page routes: GET /profile and GET /profile/:id.
 * @param {import('express').Router} router
 */
function register(router) {
  router.get('/profile', requireAuth, async (req, res) => {
    try {
      const axiosConfig = getAxiosConfig(req);
      const [userResponse, postsResponse, suggestionsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/users/profile`, axiosConfig),
        axios.get(`${API_URL}/api/posts/user`, axiosConfig).catch(() => ({ data: { posts: [] } })),
        axios
          .get(`${API_URL}/api/users/suggestions`, axiosConfig)
          .catch(() => ({ data: { suggestions: [] } })),
      ]);
      const user = withRole(userResponse.data.user, res.locals.authPayload);
      res.render('layout', {
        page: 'profile.ejs',
        user,
        profileUser: user,
        posts: postsResponse.data.posts || [],
        suggestions: suggestionsResponse.data.suggestions || [],
        isOwner: true,
        isFollowing: false,
      });
    } catch (error) {
      console.error('Error loading profile page:', error.message);
      handleRouteError(error, res, 'Failed to load profile');
    }
  });

  router.get('/profile/:id', async (req, res) => {
    const userId = req.params.id;
    if (isNaN(parseInt(userId, 10))) {
      return res.status(400).render('error', { status: 400, message: 'Invalid user ID' });
    }
    try {
      const axiosConfig = getAxiosConfig(req);
      const [profileUserResponse, postsResponse, loggedInUserResponse, suggestionsResponse] =
        await Promise.all([
          axios.get(`${API_URL}/api/users/profile/${userId}`, axiosConfig),
          axios
            .get(`${API_URL}/api/posts/user/${userId}`, axiosConfig)
            .catch(() => ({ data: { posts: [] } })),
          axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
          axios
            .get(`${API_URL}/api/users/suggestions`, axiosConfig)
            .catch(() => ({ data: { suggestions: [] } })),
        ]);

      const loggedInUser = withRole(loggedInUserResponse?.data?.user || null, res.locals.authPayload);
      const profileUser = profileUserResponse.data.user;
      const isFollowing = profileUserResponse.data.isFollowing || false;
      const isOwner = loggedInUser && loggedInUser.id === profileUser.id;

      res.render('layout', {
        page: 'profile.ejs',
        user: loggedInUser,
        profileUser: profileUser,
        posts: postsResponse.data.posts || [],
        suggestions: suggestionsResponse.data.suggestions || [],
        isOwner,
        isFollowing,
      });
    } catch (error) {
      console.error('Error loading profile page:', error.message);
      handleRouteError(error, res, 'Failed to load profile', 'User not found');
    }
  });
}

module.exports = register;
