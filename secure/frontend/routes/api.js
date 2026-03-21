const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');
const { parseContent } = require('../utils/contentParser');
const { getAxiosConfig } = require('../middleware/cookieForward');
const { API_URL } = require('../config');

const router = express.Router();
const upload = multer();

router.post('/api/upload', upload.array('attachments', 5), async (req, res) => {
  try {
    const formData = new FormData();

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        formData.append('attachments', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });
    }

    const axiosConfig = {
      ...getAxiosConfig(req),
      method: 'POST',
      url: `${API_URL}/api/upload`,
      data: formData,
      headers: {
        ...formData.getHeaders(),
        ...(req.cookies && req.cookies.auth ? { Cookie: `auth=${req.cookies.auth}` } : {}),
      },
    };

    const response = await axios(axiosConfig);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Upload proxy error:', error.message);

    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Upload proxy error' };

    res.status(status).json(data);
  }
});

async function renderPostsAsJson(posts, limit, res) {
  const hasMore = posts.length > limit;
  const postsToRender = hasMore ? posts.slice(0, limit) : posts;
  if (postsToRender.length === 0) {
    return res.json({ html: '', hasMore: false });
  }
  const templatePath = path.join(__dirname, '../components/postTemplate.ejs');
  const htmlParts = await Promise.all(
    postsToRender.map(post =>
      ejs.renderFile(templatePath, { post, showAttachments: true, parseContent })
    )
  );
  res.json({ html: htmlParts.join(''), hasMore });
}

router.get('/api/posts/html', async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const limit = parseInt(req.query.limit) || 20;
    const response = await axios.get(`${API_URL}/api/posts`, {
      ...axiosConfig,
      params: { page: req.query.page || 1, limit: limit + 1 },
    });
    await renderPostsAsJson(response.data.posts || [], limit, res);
  } catch (error) {
    console.error('Error rendering posts:', error);
    res.status(500).json({ html: '', hasMore: false });
  }
});

router.get('/api/posts/followed/html', async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const limit = parseInt(req.query.limit) || 20;
    const response = await axios.get(`${API_URL}/api/posts/followed`, {
      ...axiosConfig,
      params: { page: req.query.page || 1, limit: limit + 1 },
    });
    await renderPostsAsJson(response.data.posts || [], limit, res);
  } catch (error) {
    console.error('Error rendering followed posts:', error);
    res.status(500).json({ html: '', hasMore: false });
  }
});

router.get('/api/posts/user/html', async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const limit = parseInt(req.query.limit) || 20;
    const response = await axios.get(`${API_URL}/api/posts/user`, {
      ...axiosConfig,
      params: { page: req.query.page || 1, limit: limit + 1 },
    });
    await renderPostsAsJson(response.data.posts || [], limit, res);
  } catch (error) {
    console.error('Error rendering user posts:', error);
    res.status(500).json({ html: '', hasMore: false });
  }
});

router.get('/api/posts/user/:id/html', async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const limit = parseInt(req.query.limit) || 20;
    const response = await axios.get(`${API_URL}/api/posts/user/${req.params.id}`, {
      ...axiosConfig,
      params: { page: req.query.page || 1, limit: limit + 1 },
    });
    await renderPostsAsJson(response.data.posts || [], limit, res);
  } catch (error) {
    console.error('Error rendering user posts:', error);
    res.status(500).json({ html: '', hasMore: false });
  }
});

const DEFAULT_CARD_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title><%= user.username %> — Profile Card</title>
  <style>
    body { font-family: sans-serif; background: #111; color: #fff; display: flex; justify-content: center; padding: 40px; }
    .card { background: #1c1c1c; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 8px 32px #0008; }
    .avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; }
    h1 { margin: 16px 0 4px; font-size: 1.5rem; }
    .handle { color: #888; margin: 0 0 12px; }
    .bio { color: #ccc; line-height: 1.5; }
    .stats { display: flex; gap: 24px; margin-top: 16px; }
    .stat span { display: block; font-size: 1.25rem; font-weight: bold; }
    .stat small { color: #888; }
    .joined { margin-top: 16px; color: #666; font-size: .85rem; }
  </style>
</head>
<body>
  <div class="card">
    <img class="avatar" src="<%= user.profile_image %>" alt="avatar">
    <h1><%= user.username %></h1>
    <p class="handle">@<%= user.tag || user.username %></p>
    <p class="bio"><%= user.bio || 'No bio yet.' %></p>
    <div class="stats">
      <div class="stat"><span><%= user.followers_count %></span><small>Followers</small></div>
      <div class="stat"><span><%= user.following_count %></span><small>Following</small></div>
    </div>
    <p class="joined">Member since <%= new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) %></p>
  </div>
</body>
</html>`;

/**
 * POST /api/profile/export
 * Renders a user-editable EJS template with the caller's profile data and
 * returns the result as a downloadable HTML file ("business card").
 *
 * Body: { template?: string }  — omit to use the default card template
 * Returns: text/html with Content-Disposition: attachment
 *
 * NOTE: must be registered BEFORE the catch-all router.all('/api/*') proxy.
 */
router.post('/api/profile/export', async (req, res) => {
  const template = req.body.template || DEFAULT_CARD_TEMPLATE;

  try {
    const axiosConfig = getAxiosConfig(req);
    let user = {};
    try {
      const userResponse = await axios.get(`${API_URL}/api/users/profile`, axiosConfig);
      user = userResponse.data.user || {};
    } catch (_) {
      // unauthenticated export — user context stays empty
    }

    // Render caller-supplied (or default) EJS template with profile data.
    const html = ejs.render(template, { user, parseContent });

    const filename = `${(user.username || 'profile').replace(/[^a-z0-9_-]/gi, '_')}_card.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(html);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Chat file upload proxy — must be before catch-all to handle multipart/form-data
router.post('/api/chat/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    const response = await axios({
      method: 'POST',
      url: `${API_URL}/api/chat/upload`,
      data: formData,
      headers: {
        ...formData.getHeaders(),
        ...(req.cookies && req.cookies.auth ? { Cookie: `auth=${req.cookies.auth}` } : {}),
      },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Chat upload proxy error' };
    res.status(status).json(data);
  }
});

router.all('/api/*', async (req, res) => {
  try {
    const apiPath = req.path;
    const axiosConfig = {
      ...getAxiosConfig(req),
      method: req.method,
      url: `${API_URL}${apiPath}`,
      data: req.body,
      params: req.query,
    };

    const response = await axios(axiosConfig);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('API Proxy error:', error.message);

    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Proxy error' };

    res.status(status).json(data);
  }
});

module.exports = router;
