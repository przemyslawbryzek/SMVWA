const { PAGINATION } = require('../config/constants');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isProvided(value) {
  return value !== undefined && value !== null && value !== '';
}

function assertNumericIfProvided(value, fieldName) {
  if (!isProvided(value)) {
    return;
  }

  if (isNaN(Number(value))) {
    throw new ValidationError(`Invalid ${fieldName}`);
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

  assertNumericIfProvided(data.root_id, 'root_id');
  assertNumericIfProvided(data.parent_id, 'parent_id');
  assertNumericIfProvided(data.citation_id, 'citation_id');
}

function validatePaginationParams(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT;

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
