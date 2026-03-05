const { PAGINATION } = require('../config/constants');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validatePostInput(data) {
  if (!data.content || typeof data.content !== 'string') {
    throw new ValidationError('Content is required and must be a string');
  }

  const trimmedContent = data.content.trim();
  if (trimmedContent.length === 0) {
    throw new ValidationError('Content cannot be empty');
  }

  if (trimmedContent.length > 5000) {
    throw new ValidationError('Content too long (max 5000 characters)');
  }

  if (data.attachment_urls && !Array.isArray(data.attachment_urls)) {
    throw new ValidationError('Attachments must be an array');
  }

  if (data.root_id != null && isNaN(Number(data.root_id))) {
    throw new ValidationError('Invalid root_id');
  }

  if (data.parent_id != null && isNaN(Number(data.parent_id))) {
    throw new ValidationError('Invalid parent_id');
  }

  if (data.citation_id != null && isNaN(Number(data.citation_id))) {
    throw new ValidationError('Invalid citation_id');
  }
}

function validatePaginationParams(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;

  if (page < 1) {
    throw new ValidationError('Page must be >= 1');
  }

  if (limit < 1 || limit > PAGINATION.MAX_LIMIT) {
    throw new ValidationError(`Limit must be between 1 and ${PAGINATION.MAX_LIMIT}`);
  }

  return { page, limit };
}

module.exports = {
  ValidationError,
  validatePostInput,
  validatePaginationParams,
};
