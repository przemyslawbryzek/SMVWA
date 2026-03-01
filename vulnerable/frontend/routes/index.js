const express = require('express');
const axios = require('axios');
const { getAxiosConfig } = require('../middleware/cookieForward');
const { requireAuth, requireAdmin, withRole } = require('../middleware/auth');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:3001';

router.get('/', requireAuth, async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const [postsResponse, userResponse, suggestionsResponse] = await Promise.all([
      axios.get(`${API_URL}/api/posts`, axiosConfig),
      axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
      axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => null)
    ]);
    res.render('layout', {
      page: 'home.ejs',
      posts: postsResponse.data.posts || [],
      user: withRole(userResponse?.data?.user || null, req),
      suggestions: suggestionsResponse?.data?.suggestions || []
    });

  } catch (error) {
    console.error('Error loading home page:', error.message);
    if (error.response?.status === 401) return res.redirect('/login');
    const status = error.response?.status || 500;
    res.status(status).render('error', { status, message: 'Failed to load home page' });
  }
});
router.get('/post/:id', requireAuth, async (req, res) => {
  const postId = req.params.id;
  try {
    const axiosConfig = getAxiosConfig(req);
    const [postResponse, userResponse, commentsResponse ,threadResponse, suggestionsResponse] = await Promise.all([
      axios.get(`${API_URL}/api/posts/${postId}`, axiosConfig),
      axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
      axios.get(`${API_URL}/api/posts/${postId}/comments`, axiosConfig).catch(() => null),
      axios.get(`${API_URL}/api/posts/${postId}/thread`, axiosConfig).catch(() => null),
      axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => null)
    ]);
    res.render('layout', {
      page: 'post.ejs',
      post: postResponse.data.post,
      user: withRole(userResponse?.data?.user || null, req),
      comments: commentsResponse?.data?.comments || [],
      thread: threadResponse?.data?.thread || [],
      suggestions: suggestionsResponse?.data?.suggestions || []
    });

  } catch (error) {
    console.error('Error loading post page:', error.message);
    if (error.response?.status === 401) return res.redirect('/login');
    if (error.response?.status === 404) return res.status(404).render('error', { status: 404, message: 'Post not found' });
    const status = error.response?.status || 500;
    res.status(status).render('error', { status, message: 'Failed to load post' });
  }
});
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const [userResponse, postsResponse, suggestionsResponse] = await Promise.all([
      axios.get(`${API_URL}/api/users/profile`, axiosConfig),
      axios.get(`${API_URL}/api/posts/user`, axiosConfig).catch(() => ({ data: { posts: [] } })),
      axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => ({ data: { suggestions: [] } }))
    ]);
    const user = withRole(userResponse.data.user, req);
    res.render('layout', {
      page: 'profile.ejs',
      user,
      profileUser: user,
      posts: postsResponse.data.posts || [],
      suggestions: suggestionsResponse.data.suggestions || [],
      isOwner: true,
      isFollowing: false
    });

  } catch (error) {
    console.error('Error loading profile page:', error.message);
    if (error.response?.status === 401) return res.redirect('/login');
    const status = error.response?.status || 500;
    res.status(status).render('error', { status, message: 'Failed to load profile' });
  }
});
router.get('/profile/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const axiosConfig = getAxiosConfig(req);
    const [profileUserResponse, postsResponse, loggedInUserResponse, suggestionsResponse] = await Promise.all([
      axios.get(`${API_URL}/api/users/profile/${userId}`, axiosConfig),
      axios.get(`${API_URL}/api/posts/user/${userId}`, axiosConfig).catch(() => ({ data: { posts: [] } })),
      axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
      axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => ({ data: { suggestions: [] } }))
    ]);
    
    const loggedInUser = withRole(loggedInUserResponse?.data?.user || null, req);
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
      isFollowing
    });

  } catch (error) {
    console.error('Error loading profile page:', error.message);
    if (error.response?.status === 401) return res.redirect('/login');
    if (error.response?.status === 404) return res.status(404).render('error', { status: 404, message: 'User not found' });
    const status = error.response?.status || 500;
    res.status(status).render('error', { status, message: 'Failed to load profile' });
  }
});
router.get('/explore', requireAuth, async (req, res) => {
  const searchQuery = req.query.q || req.query.search || '';
  const searchType = req.query.type || 'top';
  
  try {
    const axiosConfig = getAxiosConfig(req);
    let results = null;
    if (searchQuery) {
      try {
        const searchResponse = await axios.get(
          `${API_URL}/api/posts/search`,
          { ...axiosConfig, params: { q: searchQuery, type: searchType } }
        );
        results = searchResponse.data;
      } catch (err) {
        console.error('Search error:', err.message);
        results = { posts: [], users: [] };
      }
    }
    
    const [userResponse, suggestionsResponse] = await Promise.all([
      axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
      axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => null)
    ]);
    
    res.render('layout', {
      page: 'explore.ejs',
      results: results,
      searchQuery: searchQuery,
      searchType: searchType,
      user: withRole(userResponse?.data?.user || null, req),
      suggestions: suggestionsResponse?.data?.suggestions || []
    });

  } catch (error) {
    console.error('Error loading explore page:', error.message);
    if (error.response?.status === 401) return res.redirect('/login');
    const status = error.response?.status || 500;
    res.status(status).render('error', { status, message: 'Failed to load explore page' });
  }
});
router.get('/post/:postId/photo/:photoId', requireAuth, async (req, res) => {
  const postId = req.params.postId;
  const photoId = parseInt(req.params.photoId, 10);
  try {
    const axiosConfig = getAxiosConfig(req);
    const [postResponse, userResponse, commentsResponse ,threadResponse] = await Promise.all([
      axios.get(`${API_URL}/api/posts/${postId}`, axiosConfig),
      axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
      axios.get(`${API_URL}/api/posts/${postId}/comments`, axiosConfig).catch(() => null),
      axios.get(`${API_URL}/api/posts/${postId}/thread`, axiosConfig).catch(() => null),
    ]);
    res.render('photo', {
      post: postResponse.data.post,
      user: withRole(userResponse?.data?.user || null, req),
      comments: commentsResponse?.data?.comments || [],
      thread: threadResponse?.data?.thread || [],
      photoId: photoId
    });
  } catch (error) {
    console.error('Error loading photo page:', error.message);
    if (error.response?.status === 401) return res.redirect('/login');
    if (error.response?.status === 404) return res.status(404).render('error', { status: 404, message: 'Photo not found' });
    res.status(500).render('error', { status: 500, message: 'Failed to load photo' });
  }
});
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const usersResponse = await axios.get(`${API_URL}/api/admin/users`, axiosConfig);
    res.render('admin', {
      page: 'users',
      users: usersResponse.data.users || []
    });
  } catch (error) {
    console.error('Error loading admin page:', error.message);
    if (error.response?.status === 401) return res.redirect('/login');
    const status = error.response?.status || 500;
    res.status(status).render('error', { status, message: 'Failed to load admin panel' });
  }
});

router.get('/admin/reported/posts', requireAdmin, async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const response = await axios.get(`${API_URL}/api/admin/reported/posts`, axiosConfig);
    res.render('admin', {
      page: 'reported_posts',
      reportedPosts: response.data.reportedPosts || []
    });
  } catch (error) {
    console.error('Error loading reported posts:', error.message);
    if (error.response?.status === 401) return res.redirect('/login');
    const status = error.response?.status || 500;
    res.status(status).render('error', { status, message: 'Failed to load reported posts' });
  }
});

router.get('/admin/reported/users', requireAdmin, async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const response = await axios.get(`${API_URL}/api/admin/reported/users`, axiosConfig);
    res.render('admin', {
      page: 'reported_users',
      reportedUsers: response.data.reportedUsers || []
    });
  } catch (error) {
    console.error('Error loading reported users:', error.message);
    if (error.response?.status === 401) return res.redirect('/login');
    const status = error.response?.status || 500;
    res.status(status).render('error', { status, message: 'Failed to load reported users' });
  }
});

module.exports = router;
