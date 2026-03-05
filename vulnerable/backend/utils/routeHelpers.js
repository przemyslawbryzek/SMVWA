const { HTTP_STATUS } = require('../config/constants');

/**
 * Sends a standardised 500 JSON response and logs the error.
 *
 * @param {import('express').Response} res
 * @param {Error} error   The caught error object
 * @param {string} [context]  Human-readable description of what failed (used only in the log)
 */
function handleError(res, error, context = 'Unhandled error') {
  console.error(`${context}:`, error);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: 'Internal server error',
    details: error.message,
  });
}

module.exports = { handleError };
