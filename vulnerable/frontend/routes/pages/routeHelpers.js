/**
 * Shared error handler for frontend page routes.
 * @param {Error} error
 * @param {import('express').Response} res
 * @param {string} fallbackMessage
 * @param {string} [notFoundMessage]
 */
function handleRouteError(error, res, fallbackMessage, notFoundMessage) {
  if (error.response?.status === 401) return res.redirect('/login');
  if (notFoundMessage && error.response?.status === 404) {
    return res.status(404).render('error', { status: 404, message: notFoundMessage });
  }
  const status = error.response?.status || 500;
  res.status(status).render('error', { status, message: fallbackMessage });
}

module.exports = { handleRouteError };
