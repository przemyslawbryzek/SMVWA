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


// Allowed file types and max size (5MB per file)
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt'];
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
  'text/plain',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Prohibited file type'));
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Prohibited file type'));
  }
  cb(null, true);
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

router.post('/', authMiddleware, requireCsrf, (req, res, next) => {
  upload.array('attachments', 5)(req, res, function (err) {
    if (err) {
      let message = err.message || 'Upload error';
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'File is too large (max 5MB)';
      }
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No files uploaded' });
    }
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const fileUrls = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
    return res.status(201).json({ attachment_urls: fileUrls });
  });
});

module.exports = router;
