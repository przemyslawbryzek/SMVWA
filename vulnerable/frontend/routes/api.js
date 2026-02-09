const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { getAxiosConfig } = require('../middleware/cookieForward');

const router = express.Router();
const API_URL = process.env.API_URL || 'http://localhost:3001';
const upload = multer();

// Special handler for file uploads
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
