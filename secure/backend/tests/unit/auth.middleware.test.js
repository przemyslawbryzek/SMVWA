'use strict';

jest.mock('../../db/pool');

const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');
const { authMiddleware, optionalAuth, requireAdmin } = require('../../middleware/auth');
const { AUTH } = require('../../config/constants');
const { blacklistToken, _resetTokenBlacklist } = require('../../utils/tokenBlacklist');

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Create a valid auth cookie value for the given payload */
function makeToken(payload) {
  return jwt.sign(payload, AUTH.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
}

/** Build lightweight mock req / res / next */
function mockRRN(reqOverrides = {}) {
  const req = { cookies: {}, headers: {}, ...reqOverrides };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

// ─── authMiddleware ───────────────────────────────────────────────────────────

describe('authMiddleware', () => {
  beforeEach(() => {
    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await _resetTokenBlacklist();
  });

  it('returns 401 when no cookie is present', async () => {
    const { req, res, next } = mockRRN();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/unauthorize/i) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when cookie has invalid content', async () => {
    const { req, res, next } = mockRRN({ cookies: { auth: '!!!not-base64-json!!!' } });
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and populates req.user for a valid token', async () => {
    const payload = { userId: 42, role: 'user' };
    const { req, res, next } = mockRRN({ cookies: { auth: makeToken(payload) } });
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.userId).toBe(42);
    expect(req.user.role).toBe('user');
  });

  it('accepts admin role in token', async () => {
    const { req, res, next } = mockRRN({
      cookies: { auth: makeToken({ userId: 1, role: 'admin' }) },
    });
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('admin');
  });

  it('returns 401 when no valid credentials are present', async () => {
    const { req, res, next } = mockRRN();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token has been revoked', async () => {
    pool.query.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('SELECT 1') && sql.includes('revoked_tokens')) {
        return Promise.resolve({ rows: [{ token_hash: 'revoked' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const token = makeToken({ userId: 42, role: 'user' });
    await blacklistToken(token, Math.floor(Date.now() / 1000) + 3600);

    const { req, res, next } = mockRRN({ cookies: { auth: token } });
    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/revoked/i) }));
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── optionalAuth ─────────────────────────────────────────────────────────────

describe('optionalAuth', () => {
  beforeEach(() => {
    pool.query.mockResolvedValue({ rows: [] });
  });

  it('sets req.user to null when no cookie is present', async () => {
    const { req, res, next } = mockRRN();
    await optionalAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeNull();
  });

  it('populates req.user for a valid cookie', async () => {
    const payload = { userId: 7, role: 'user' };
    const { req, res, next } = mockRRN({ cookies: { auth: makeToken(payload) } });
    await optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.userId).toBe(7);
  });

  it('sets req.user to null for an invalid cookie (does NOT respond 400)', async () => {
    const { req, res, next } = mockRRN({ cookies: { auth: '!garbage!' } });
    await optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('never calls res.status in any scenario', async () => {
    const { req, res, next } = mockRRN({ cookies: { auth: makeToken({ userId: 1, role: 'user' }) } });
    await optionalAuth(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe('requireAdmin', () => {
  it('returns 401 when req.user is null', () => {
    const { req, res, next } = mockRRN();
    req.user = null;
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user is undefined', () => {
    const { req, res, next } = mockRRN();
    // req.user is not set at all
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when user role is "user"', () => {
    const { req, res, next } = mockRRN();
    req.user = { userId: 1, role: 'user' };
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/admin/i) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user role is "admin"', () => {
    const { req, res, next } = mockRRN();
    req.user = { userId: 1, role: 'admin' };
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

});
