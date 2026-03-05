const axios = require('axios');
const { getAxiosConfig } = require('../../middleware/cookieForward');
const { optionalAuth, withRole } = require('../../middleware/auth');
const { API_URL } = require('../../config');
const { handleRouteError } = require('./routeHelpers');

/**
 * Registers post page routes: GET /post/:id and GET /post/:postId/photo/:photoId.
 * @param {import('express').Router} router
 */
function register(router) {
  router.get('/post/:id', optionalAuth, async (req, res) => {
    const postId = req.params.id;
    if (isNaN(parseInt(postId, 10))) {
      return res.status(400).render('error', { status: 400, message: 'Invalid post ID' });
    }
    try {
      const axiosConfig = getAxiosConfig(req);
      const [postResponse, userResponse, commentsResponse, threadResponse, suggestionsResponse] =
        await Promise.all([
          axios.get(`${API_URL}/api/posts/${postId}`, axiosConfig),
          axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
          axios.get(`${API_URL}/api/posts/${postId}/comments`, axiosConfig).catch(() => null),
          axios.get(`${API_URL}/api/posts/${postId}/thread`, axiosConfig).catch(() => null),
          axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => null),
        ]);
      const postData = postResponse.data.post;
      const thread = threadResponse?.data?.thread || [];

      // Compute list of unique authors for the "Relevant people" sidebar panel.
      // Done here to keep template logic simple.
      const seenIds = new Set();
      const relevantPeople = [];
      thread.forEach(p => {
        if (p.author && !seenIds.has(p.author.id)) {
          seenIds.add(p.author.id);
          relevantPeople.push(p.author);
        }
      });
      if (postData?.author && !seenIds.has(postData.author.id)) {
        seenIds.add(postData.author.id);
        relevantPeople.push(postData.author);
      }
      if (postData?.citation?.author && !seenIds.has(postData.citation.author.id)) {
        relevantPeople.push(postData.citation.author);
      }

      res.render('layout', {
        page: 'post.ejs',
        post: postData,
        user: withRole(userResponse?.data?.user || null, res.locals.authPayload),
        comments: commentsResponse?.data?.comments || [],
        thread,
        suggestions: suggestionsResponse?.data?.suggestions || [],
        relevantPeople,
      });
    } catch (error) {
      console.error('Error loading post page:', error.message);
      handleRouteError(error, res, 'Failed to load post', 'Post not found');
    }
  });

  router.get('/post/:postId/photo/:photoId', optionalAuth, async (req, res) => {
    const postId = req.params.postId;
    const photoId = parseInt(req.params.photoId, 10);
    if (isNaN(parseInt(postId, 10)) || isNaN(photoId) || photoId < 0) {
      return res.status(400).render('error', { status: 400, message: 'Invalid post or photo ID' });
    }
    try {
      const axiosConfig = getAxiosConfig(req);
      const [postResponse, userResponse, commentsResponse, threadResponse] = await Promise.all([
        axios.get(`${API_URL}/api/posts/${postId}`, axiosConfig),
        axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
        axios.get(`${API_URL}/api/posts/${postId}/comments`, axiosConfig).catch(() => null),
        axios.get(`${API_URL}/api/posts/${postId}/thread`, axiosConfig).catch(() => null),
      ]);
      res.render('photo', {
        post: postResponse.data.post,
        user: withRole(userResponse?.data?.user || null, res.locals.authPayload),
        comments: commentsResponse?.data?.comments || [],
        thread: threadResponse?.data?.thread || [],
        photoId: photoId,
      });
    } catch (error) {
      console.error('Error loading photo page:', error.message);
      handleRouteError(error, res, 'Failed to load photo', 'Photo not found');
    }
  });
}

module.exports = register;
