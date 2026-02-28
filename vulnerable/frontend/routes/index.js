const express = require('express');
const axios = require('axios');
const { getAxiosConfig } = require('../middleware/cookieForward');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:3001/api';

router.get('/', async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    if (!req.cookies || !req.cookies.auth) {
      return res.redirect('/login');
    }
    const [postsResponse, userResponse, suggestionsResponse] = await Promise.all([
      axios.get(`${API_URL}/api/posts`, axiosConfig),
      axios.get(`${API_URL}/api/users/profile`, axiosConfig).catch(() => null),
      axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => null)
    ]);
    res.render('layout', {
      page: 'home.ejs',
      posts: postsResponse.data.posts || [],
      user: userResponse?.data?.user || null,
      suggestions: suggestionsResponse?.data?.suggestions || []
    });

  } catch (error) {
    console.error('Error loading home page:', error.message);

    if (error.response?.status === 401) {
      return res.redirect('/login');
    }

    res.render('layout', {
      page: 'home.ejs',
      posts: [],
      user: null,
      suggestions: [],
      error: 'Failed to load data'
    });
  }
});
router.get('/post/:id', async (req, res) => {
  const postId = req.params.id;
  try {
    const axiosConfig = getAxiosConfig(req);
    if (!req.cookies || !req.cookies.auth) {
      return res.redirect('/login');
    }
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
      user: userResponse?.data?.user || null,
      comments: commentsResponse?.data?.comments || [],
      thread: threadResponse?.data?.thread || [],
      suggestions: suggestionsResponse?.data?.suggestions || []
    });

  } catch (error) {
    console.error('Error loading post page:', error.message);

    if (error.response?.status === 401) {
      return res.redirect('/login');
    }

    res.render('layout', {
      page: 'post.ejs',
      post: null,
      user: null,
      comments: [],
      thread: [],
      suggestions: [],
      error: 'Failed to load data'
    });
  }
});
router.get('/profile', async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    if (!req.cookies || !req.cookies.auth) {
      return res.redirect('/login');
    }
    const [userResponse, postsResponse, suggestionsResponse] = await Promise.all([
      axios.get(`${API_URL}/api/users/profile`, axiosConfig),
      axios.get(`${API_URL}/api/posts/user`, axiosConfig).catch(() => ({ data: { posts: [] } })),
      axios.get(`${API_URL}/api/users/suggestions`, axiosConfig).catch(() => ({ data: { suggestions: [] } }))
    ]);
    res.render('layout', {
      page: 'profile.ejs',
      user: userResponse.data.user,
      profileUser: userResponse.data.user,
      posts: postsResponse.data.posts || [],
      suggestions: suggestionsResponse.data.suggestions || [],
      isOwner: true,
      isFollowing: false
    });

  } catch (error) {
    console.error('Error loading profile page:', error.message);

    if (error.response?.status === 401) {
      return res.redirect('/login');
    }

    res.render('layout', {
      page: 'profile.ejs',
      user: null,
      profileUser: null,
      posts: [],
      suggestions: [],
      error: 'Failed to load data',
      isOwner: false,
      isFollowing: false
    });
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
    
    const loggedInUser = loggedInUserResponse?.data?.user || null;
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

    if (error.response?.status === 401) {
      return res.redirect('/login');
    }

    res.render('layout', {
      page: 'profile.ejs',
      user: null,
      profileUser: null,
      posts: [],
      suggestions: [],
      error: 'Failed to load data',
      isOwner: false,
      isFollowing: false
    });
  }
});
router.get('/explore', async (req, res) => {
  const searchQuery = req.query.q || req.query.search || '';
  const searchType = req.query.type || 'top';
  
  try {
    const axiosConfig = getAxiosConfig(req);
    if (!req.cookies || !req.cookies.auth) {
      return res.redirect('/login');
    }
    
    let results = null;
    if (searchQuery) {
      try {
        const searchResponse = await axios.get(
          `${API_URL}/api/posts/search?q=${encodeURIComponent(searchQuery)}&type=${encodeURIComponent(searchType)}`, 
          axiosConfig
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
      user: userResponse?.data?.user || null,
      suggestions: suggestionsResponse?.data?.suggestions || []
    });

  } catch (error) {
    console.error('Error loading explore page:', error.message);

    if (error.response?.status === 401) {
      return res.redirect('/login');
    }

    res.render('layout', {
      page: 'explore.ejs',
      results: null,
      searchQuery: '',
      searchType: 'latest',
      user: null,
      suggestions: [],
      error: 'Failed to load data'
    });
  }
});
module.exports = router;
