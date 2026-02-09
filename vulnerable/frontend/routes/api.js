const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');
const { getAxiosConfig } = require('../middleware/cookieForward');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:3001';
const upload = multer();

router.post('/api/upload', upload.array('attachments', 5), async (req, res) => {
  try {
    const formData = new FormData();
    
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        formData.append('attachments', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
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
        ...(req.cookies && req.cookies.auth ? { 'Cookie': `auth=${req.cookies.auth}` } : {})
      }
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

router.get('/api/posts/html', async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const response = await axios.get(`${API_URL}/api/posts`, axiosConfig);
    const posts = response.data.posts || [];
    
    if (posts.length === 0) {
      return res.send('<div class="p-4 text-center text-gray-500">No posts to show</div>');
    }
    
    const templatePath = path.join(__dirname, '../components/postTemplate.ejs');
    const htmlPromises = posts.map(post => ejs.renderFile(templatePath, { post }));
    const htmlParts = await Promise.all(htmlPromises);
    
    res.send(htmlParts.join(''));
  } catch (error) {
    console.error('Error rendering posts:', error);
    res.status(500).send('<div class="p-4 text-center text-gray-500">Failed to load posts</div>');
  }
});

router.get('/api/posts/followed/html', async (req, res) => {
  try {
    const axiosConfig = getAxiosConfig(req);
    const response = await axios.get(`${API_URL}/api/posts/followed`, axiosConfig);
    const posts = response.data.posts || [];
    
    if (posts.length === 0) {
      return res.send('<div class="p-4 text-center text-gray-500">No posts from followed users</div>');
    }
    
    const templatePath = path.join(__dirname, '../components/postTemplate.ejs');
    const htmlPromises = posts.map(post => ejs.renderFile(templatePath, { post }));
    const htmlParts = await Promise.all(htmlPromises);
    
    res.send(htmlParts.join(''));
  } catch (error) {
    console.error('Error rendering followed posts:', error);
    res.status(500).send('<div class="p-4 text-center text-gray-500">Failed to load posts</div>');
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
      params: req.query
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
