const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');
const { HTTP_STATUS } = require('../config/constants');
const { handleError } = require('../utils/routeHelpers');

const router = express.Router();

const uploadPath = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post('/', authMiddleware, requireCsrf, upload.array('attachments', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No files uploaded' });
    }
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const fileUrls = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
    return res.status(201).json({ attachment_urls: fileUrls });
  } catch (error) {
    return handleError(res, error, 'Upload error');
  }
});

module.exports = router;
