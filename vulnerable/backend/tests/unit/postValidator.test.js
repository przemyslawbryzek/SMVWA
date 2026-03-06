'use strict';

const {
  validatePostInput,
  validatePaginationParams,
  ValidationError,
} = require('../../validators/postValidator');

// ─── ValidationError class ───────────────────────────────────────────────────

describe('ValidationError', () => {
  it('is an instance of Error', () => {
    const err = new ValidationError('test msg');
    expect(err).toBeInstanceOf(Error);
  });

  it('has name "ValidationError"', () => {
    expect(new ValidationError('x').name).toBe('ValidationError');
  });

  it('stores the message', () => {
    expect(new ValidationError('hello').message).toBe('hello');
  });
});

// ─── validatePostInput ────────────────────────────────────────────────────────

describe('validatePostInput', () => {
  it('accepts valid content', () => {
    expect(() => validatePostInput({ content: 'Hello world' })).not.toThrow();
  });

  it('throws when content is missing', () => {
    expect(() => validatePostInput({})).toThrow(ValidationError);
    expect(() => validatePostInput({})).toThrow(/required/i);
  });

  it('throws when content is null', () => {
    expect(() => validatePostInput({ content: null })).toThrow(ValidationError);
  });

  it('throws when content is a number', () => {
    expect(() => validatePostInput({ content: 42 })).toThrow(ValidationError);
  });

  it('throws when content is only whitespace', () => {
    expect(() => validatePostInput({ content: '    ' })).toThrow(ValidationError);
    expect(() => validatePostInput({ content: '    ' })).toThrow(/empty/i);
  });

  it('throws when content exceeds 5000 characters', () => {
    expect(() => validatePostInput({ content: 'a'.repeat(5001) })).toThrow(ValidationError);
    expect(() => validatePostInput({ content: 'a'.repeat(5001) })).toThrow(/too long/i);
  });

  it('accepts content of exactly 5000 characters', () => {
    expect(() => validatePostInput({ content: 'a'.repeat(5000) })).not.toThrow();
  });

  it('accepts content of exactly 1 character', () => {
    expect(() => validatePostInput({ content: 'x' })).not.toThrow();
  });

  it('throws when attachment_urls is a string, not array', () => {
    expect(() =>
      validatePostInput({ content: 'hi', attachment_urls: 'http://example.com' })
    ).toThrow(ValidationError);
    expect(() =>
      validatePostInput({ content: 'hi', attachment_urls: 'http://example.com' })
    ).toThrow(/array/i);
  });

  it('accepts when attachment_urls is an array', () => {
    expect(() =>
      validatePostInput({ content: 'hi', attachment_urls: ['http://a.com/1.png'] })
    ).not.toThrow();
  });

  it('accepts when attachment_urls is an empty array', () => {
    expect(() => validatePostInput({ content: 'hi', attachment_urls: [] })).not.toThrow();
  });

  it('accepts when attachment_urls is undefined', () => {
    expect(() => validatePostInput({ content: 'hi' })).not.toThrow();
  });

  it('throws when root_id is a non-numeric string', () => {
    expect(() => validatePostInput({ content: 'hi', root_id: 'abc' })).toThrow(ValidationError);
    expect(() => validatePostInput({ content: 'hi', root_id: 'abc' })).toThrow(/root_id/i);
  });

  it('accepts numeric root_id', () => {
    expect(() => validatePostInput({ content: 'hi', root_id: 5 })).not.toThrow();
  });

  it('accepts string numeric root_id', () => {
    expect(() => validatePostInput({ content: 'hi', root_id: '5' })).not.toThrow();
  });

  it('accepts null root_id', () => {
    expect(() => validatePostInput({ content: 'hi', root_id: null })).not.toThrow();
  });

  it('throws when parent_id is non-numeric', () => {
    expect(() => validatePostInput({ content: 'hi', parent_id: 'xyz' })).toThrow(ValidationError);
  });

  it('throws when citation_id is an object (non-numeric)', () => {
    expect(() => validatePostInput({ content: 'hi', citation_id: {} })).toThrow(ValidationError);
  });

  it('accepts null for all optional ids', () => {
    expect(() =>
      validatePostInput({ content: 'hi', root_id: null, parent_id: null, citation_id: null })
    ).not.toThrow();
  });
});

// ─── validatePaginationParams ─────────────────────────────────────────────────

describe('validatePaginationParams', () => {
  it('returns defaults for empty query', () => {
    const result = validatePaginationParams({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20); // PAGINATION.DEFAULT_LIMIT
  });

  it('parses valid page and limit strings', () => {
    const result = validatePaginationParams({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('falls back to page=1 for page=0 (parseInt("0") || 1 = 1)', () => {
    // parseInt('0') is falsy → defaults to 1, no exception thrown
    const result = validatePaginationParams({ page: '0' });
    expect(result.page).toBe(1);
  });

  it('falls back to DEFAULT_LIMIT for limit=0 (parseInt("0") || DEFAULT = DEFAULT)', () => {
    // parseInt('0') is falsy → defaults to DEFAULT_LIMIT, no exception thrown
    const result = validatePaginationParams({ limit: '0' });
    expect(result.limit).toBe(20);
  });

  it('falls back to DEFAULT_LIMIT for negative limit', () => {
    // parseInt('-5') is -5, then Math check... actually -5 < 1 so throws
    expect(() => validatePaginationParams({ limit: '-5' })).toThrow(ValidationError);
  });

  it('falls back for negative page (parseInt("-1") || 1 depends on falsiness)', () => {
    // -1 is truthy, so page = -1, then page < 1 throws
    expect(() => validatePaginationParams({ page: '-1' })).toThrow(ValidationError);
  });

  it('throws when limit exceeds MAX_LIMIT (100)', () => {
    expect(() => validatePaginationParams({ limit: '101' })).toThrow(ValidationError);
    expect(() => validatePaginationParams({ limit: '101' })).toThrow(/limit/i);
  });

  it('accepts limit equal to MAX_LIMIT (100)', () => {
    expect(() => validatePaginationParams({ limit: '100' })).not.toThrow();
  });

  it('accepts limit of 1', () => {
    expect(() => validatePaginationParams({ limit: '1' })).not.toThrow();
  });

  it('falls back to default page=1 for non-numeric page', () => {
    // parseInt('abc') || 1 → 1
    const result = validatePaginationParams({ page: 'abc' });
    expect(result.page).toBe(1);
  });
});
