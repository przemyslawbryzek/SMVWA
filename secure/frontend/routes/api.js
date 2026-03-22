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

const MAX_EXPORT_TEMPLATE_LENGTH = 20000;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatJoinedDate(createdAt) {
  if (!createdAt) {
    return '';
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function renderProfileTemplateSafe(template, user) {
  if (typeof template !== 'string' || template.length === 0) {
    return '';
  }
  if (template.length > MAX_EXPORT_TEMPLATE_LENGTH) {
    throw new Error('Template is too large');
  }
  if (template.includes('<%') || template.includes('%>')) {
    throw new Error('EJS syntax is not allowed in export template');
  }

  return template.replace(/\{\{\s*user\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, field) => {
    switch (field) {
      case 'username':
        return escapeHtml(user.username || '');
      case 'tag':
        return escapeHtml(user.tag || user.username || '');
      case 'bio':
        return escapeHtml(user.bio || 'No bio yet.');
      case 'profile_image':
        return escapeHtml(user.profile_image || '');
      case 'followers_count':
        return escapeHtml(user.followers_count ?? 0);
      case 'following_count':
        return escapeHtml(user.following_count ?? 0);
      case 'created_at':
        return escapeHtml(user.created_at || '');
      case 'joined_date':
        return escapeHtml(formatJoinedDate(user.created_at));
      default:
        return '';
    }
  });
}

router.post('/api/upload', upload.array('attachments', 5), async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const formData = new FormData();

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        formData.append('attachments', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });
    }

    const uploadConfig = {
      ...axiosConfig,
      method: 'POST',
      url: `${API_URL}/api/upload`,
      data: formData,
      headers: {
        ...(axiosConfig.headers || {}),
        ...formData.getHeaders(),
      },
    };

    const response = await axios(uploadConfig);
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
  <title>{{ user.username }} - Profile Card</title>
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
    <img class="avatar" src="{{ user.profile_image }}" alt="avatar">
    <h1>{{ user.username }}</h1>
    <p class="handle">@{{ user.tag }}</p>
    <p class="bio">{{ user.bio }}</p>
    <div class="stats">
      <div class="stat"><span>{{ user.followers_count }}</span><small>Followers</small></div>
      <div class="stat"><span>{{ user.following_count }}</span><small>Following</small></div>
    </div>
    <p class="joined">Member since {{ user.joined_date }}</p>
  </div>
</body>
</html>`;

/**
 * POST /api/profile/export
 * Renders a user-editable HTML template with safe {{ user.* }} placeholders and
 * returns the result as a downloadable HTML file ("business card").
 *
 * Body: { template?: string }  — omit to use the default card template.
 * Supported placeholders: {{ user.username }}, {{ user.tag }}, {{ user.bio }},
 * {{ user.profile_image }}, {{ user.followers_count }}, {{ user.following_count }},
 * {{ user.joined_date }}
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

    const html = renderProfileTemplateSafe(template, user);

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
    if (!req.file) {
      return res.status(400).json({ error: 'No file' });
    }
    const axiosConfig = getAxiosConfig(req);
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    const response = await axios({
      ...axiosConfig,
      method: 'POST',
      url: `${API_URL}/api/chat/upload`,
      data: formData,
      headers: {
        ...(axiosConfig.headers || {}),
        ...formData.getHeaders(),
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
    // Get client IP from request (trusts X-Forwarded-For if present, else remote address)
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    const axiosConfig = {
      ...getAxiosConfig(req),
      method: req.method,
      url: `${API_URL}${apiPath}`,
      data: req.body,
      params: req.query,
      headers: {
        ...((getAxiosConfig(req) && getAxiosConfig(req).headers) || {}),
        'X-Forwarded-For': clientIp,
      },
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
