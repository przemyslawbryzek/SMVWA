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
