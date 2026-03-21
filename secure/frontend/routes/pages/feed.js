const axios = require('axios');
const { getAxiosConfig } = require('../../middleware/cookieForward');
const { requireAuth, optionalAuth, withRole } = require('../../middleware/auth');
const { API_URL } = require('../../config');
const { handleRouteError } = require('./routeHelpers');

/**
 * Registers feed page routes: GET / (home) and GET /explore.
 * @param {import('express').Router} router
 */
function register(router) {
  router.get('/', requireAuth, async (req, res) => {
    try {
      const axiosConfig = getAxiosConfig(req);
      const [postsResponse, userResponse, suggestionsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/posts`, axiosConfig),
        axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
        axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => null),
      ]);
      res.render('layout', {
        page: 'home.ejs',
        posts: postsResponse.data.posts || [],
        user: withRole(userResponse?.data?.user || null, res.locals.authPayload),
        suggestions: suggestionsResponse?.data?.suggestions || [],
      });
    } catch (error) {
      console.error('Error loading home page:', error.message);
      handleRouteError(error, res, 'Failed to load home page');
    }
  });

  router.get('/explore', optionalAuth, async (req, res) => {
    const searchQuery = req.query.q || req.query.search || '';
    const searchType = req.query.type || 'top';

    try {
      const axiosConfig = getAxiosConfig(req);
      let results = null;
      if (searchQuery) {
        try {
          const searchResponse = await axios.get(`${API_URL}/api/posts/search`, {
            ...axiosConfig,
            params: { q: searchQuery, type: searchType },
          });
          results = searchResponse.data;
        } catch (err) {
          console.error('Search error:', err.message);
          results = { posts: [], users: [] };
        }
      }

      const [userResponse, suggestionsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
        axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => null),
      ]);

      res.render('layout', {
        page: 'explore.ejs',
        results: results,
        searchQuery: searchQuery,
        searchType: searchType,
        user: withRole(userResponse?.data?.user || null, res.locals.authPayload),
        suggestions: suggestionsResponse?.data?.suggestions || [],
      });
    } catch (error) {
      console.error('Error loading explore page:', error.message);
      handleRouteError(error, res, 'Failed to load explore page');
    }
  });
}

module.exports = register;
