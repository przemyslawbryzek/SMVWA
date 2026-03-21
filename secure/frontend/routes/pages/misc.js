const axios = require('axios');
const { getAxiosConfig } = require('../../middleware/cookieForward');
const { requireAuth, withRole } = require('../../middleware/auth');
const { API_URL } = require('../../config');
const { handleRouteError } = require('./routeHelpers');

/**
 * Registers miscellaneous page routes: /settings, /chat, /chat/:partnerId.
 * @param {import('express').Router} router
 */
function register(router) {
  router.get('/settings', requireAuth, async (req, res) => {
    try {
      const axiosConfig = getAxiosConfig(req);
      const [userResponse, suggestionsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/users/profile`, axiosConfig),
        axios.get(`${API_URL}/api/users/suggestions`, axiosConfig),
      ]);
      res.render('layout', {
        page: 'settings.ejs',
        user: withRole(userResponse.data.user, res.locals.authPayload),
        suggestions: suggestionsResponse.data.suggestions || [],
      });
    } catch (error) {
      console.error('Error loading settings page:', error.message);
      handleRouteError(error, res, 'Failed to load settings page');
    }
  });

  router.get('/chat', requireAuth, async (req, res) => {
    try {
      const axiosConfig = getAxiosConfig(req);
      const [userResponse, conversationsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/users/profile`, axiosConfig),
        axios.get(`${API_URL}/api/chat/conversations`, axiosConfig),
      ]);
      res.render('chat', {
        user: withRole(userResponse.data.user, res.locals.authPayload),
        conversations: conversationsResponse.data || [],
        partner: null,
        messages: [],
        partnerId: null,
      });
    } catch (error) {
      console.error('Error loading chat page:', error.message);
      handleRouteError(error, res, 'Failed to load chat page');
    }
  });

  router.get('/chat/:partnerId', requireAuth, async (req, res) => {
    const partnerId = req.params.partnerId;
    try {
      const axiosConfig = getAxiosConfig(req);
      const [userResponse, conversationResponse, partnerResponse, messagesResponse] =
        await Promise.all([
          axios.get(`${API_URL}/api/users/profile`, axiosConfig),
          axios.get(`${API_URL}/api/chat/conversations`, axiosConfig),
          axios.get(`${API_URL}/api/users/profile/${partnerId}`, axiosConfig),
          axios.get(`${API_URL}/api/chat/conversations/${partnerId}/messages`, axiosConfig),
        ]);
      res.render('chat', {
        user: withRole(userResponse.data.user, res.locals.authPayload),
        conversations: conversationResponse.data || [],
        partner: partnerResponse.data?.user || null,
        messages: messagesResponse.data || [],
        partnerId,
      });
    } catch (error) {
      console.error('Error loading chat conversation:', error.message);
      handleRouteError(error, res, 'Failed to load chat conversation');
    }
  });
}

module.exports = register;
