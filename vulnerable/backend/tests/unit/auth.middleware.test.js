'use strict';

const serialize = require('node-serialize');
const { authMiddleware, optionalAuth, requireAdmin } = require('../../middleware/auth');

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Create a valid auth cookie value for the given payload */
function makeToken(payload) {
  return Buffer.from(serialize.serialize(payload)).toString('base64');
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
  it('returns 401 when no cookie is present', () => {
    const { req, res, next } = mockRRN();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/unauthorize/i) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when cookie has invalid content', () => {
    const { req, res, next } = mockRRN({ cookies: { auth: '!!!not-base64-json!!!' } });
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and populates req.user for a valid token', () => {
    const payload = { userId: 42, role: 'user' };
    const { req, res, next } = mockRRN({ cookies: { auth: makeToken(payload) } });
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.userId).toBe(42);
    expect(req.user.role).toBe('user');
  });

  it('accepts admin role in token', () => {
    const { req, res, next } = mockRRN({
      cookies: { auth: makeToken({ userId: 1, role: 'admin' }) },
    });
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('admin');
  });

  it('accepts x-internal-secret header and bypasses cookie check', () => {
    const { req, res, next } = mockRRN({
      headers: { 'x-internal-secret': 'smvwa-internal-secret' },
    });
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('internal');
    expect(req.user.isInternal).toBe(true);
  });

  it('does NOT accept a wrong internal secret', () => {
    const { req, res, next } = mockRRN({
      headers: { 'x-internal-secret': 'wrong-secret' },
    });
    authMiddleware(req, res, next);
    // No valid cookie either → 401
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── optionalAuth ─────────────────────────────────────────────────────────────

describe('optionalAuth', () => {
  it('sets req.user to null when no cookie is present', () => {
    const { req, res, next } = mockRRN();
    optionalAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeNull();
  });

  it('populates req.user for a valid cookie', () => {
    const payload = { userId: 7, role: 'user' };
    const { req, res, next } = mockRRN({ cookies: { auth: makeToken(payload) } });
    optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.userId).toBe(7);
  });

  it('sets req.user to null for an invalid cookie (does NOT respond 400)', () => {
    const { req, res, next } = mockRRN({ cookies: { auth: '!garbage!' } });
    optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('never calls res.status in any scenario', () => {
    const { req, res, next } = mockRRN({ cookies: { auth: makeToken({ userId: 1, role: 'user' }) } });
    optionalAuth(req, res, next);
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

  it('calls next when user role is "internal"', () => {
    const { req, res, next } = mockRRN();
    req.user = { userId: 0, role: 'internal', isInternal: true };
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
