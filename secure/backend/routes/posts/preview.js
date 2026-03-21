const http = require('http');
const https = require('https');
const { optionalAuth } = require('../../middleware/auth');
const { HTTP_STATUS } = require('../../config/constants');

/**
 * Registers the POST /preview route on the provided router.
 * @param {import('express').Router} router
 */
function register(router) {
  router.post('/preview', optionalAuth, async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'URL is required' });
    }

    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, { timeout: 5000 }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        const title = (data.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
        const description =
          (data.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] ||
          (data.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i) || [])[1] || '';
        const ogImage =
          (data.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
        return res.json({
          url,
          title: title.trim(),
          description: description.trim(),
          image: ogImage,
          responseSize: data.length,
          statusCode: response.statusCode,
          headers: response.headers,
          rawBody: data.substring(0, 2000),
        });
      });
    });

    request.on('timeout', () => {
      request.destroy();
      return res.status(504).json({ error: 'Request timed out', url });
    });

    request.on('error', (err) => {
      return res.status(500).json({ error: 'Request failed', details: err.message, url });
    });
  });
}

module.exports = register;
