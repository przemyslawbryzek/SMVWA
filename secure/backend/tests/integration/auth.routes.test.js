'use strict';

/**
 * Integration tests for backend/routes/auth.js
 *
 * The pg pool is mocked so no real database is required.
 * bcrypt calls are real but use only 1 salt round to stay fast.
 */

jest.mock('../../db/pool');

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');
const authRoutes = require('../../routes/auth');
const { authMiddleware } = require('../../middleware/auth');
const { AUTH } = require('../../config/constants');
const { _resetTokenBlacklist } = require('../../utils/tokenBlacklist');

// ─── app factory ─────────────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', authRoutes);
  app.get('/api/protected', authMiddleware, (req, res) => {
    res.json({ ok: true, userId: req.user.userId });
  });
  return app;
}

let app;

beforeAll(() => {
  app = buildApp();
});

afterEach(async () => {
  jest.resetAllMocks();
  await _resetTokenBlacklist();
});

beforeEach(() => {
  pool.query.mockResolvedValue({ rows: [] });
});

// ─── POST /api/register ───────────────────────────────────────────────────────

describe('POST /api/register', () => {
  it('returns 400 when all fields are missing', async () => {
    const res = await request(app).post('/api/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ email: 'a@a.com', password: 'P1!', confirm_password: 'P1!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when passwords do not match', async () => {
    const res = await request(app).post('/api/register').send({
      username: 'alice',
      email: 'a@a.com',
      password: 'Secret1!',
      confirm_password: 'Different!',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/match/i);
  });

  it('returns 201 with user data on success', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, username: 'alice', email: 'a@a.com', created_at: new Date() }],
    });

    const res = await request(app).post('/api/register').send({
      username: 'alice',
      email: 'a@a.com',
      password: 'Secret1!',
      confirm_password: 'Secret1!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('returns 500 when DB throws (duplicate key)', async () => {
    pool.query.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

    const res = await request(app).post('/api/register').send({
      username: 'alice',
      email: 'a@a.com',
      password: 'Abc1!',
      confirm_password: 'Abc1!',
    });

    expect(res.status).toBe(500);
  });
});

// ─── POST /api/login ──────────────────────────────────────────────────────────

describe('POST /api/login', () => {
  it('returns 401 when email is not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/login').send({ email: 'no@one.com', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/credentials/i);
  });

  it('returns 401 when password is wrong', async () => {
    const hash = await bcrypt.hash('correct', 1);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, isadmin: false, email: 'a@a.com', password: hash }],
    });

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'a@a.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/credentials/i);
  });

  it('returns 200 and sets auth cookie on success', async () => {
    const hash = await bcrypt.hash('Secret1!', 1);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, isadmin: false, email: 'a@a.com', password: hash }],
    });

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'a@a.com', password: 'Secret1!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/^auth=/);
  });

  it('token contains userId and correct role for normal user', async () => {
    const hash = await bcrypt.hash('pass', 1);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 42, isadmin: false, email: 'a@a.com', password: hash }],
    });

    const res = await request(app).post('/api/login').send({ email: 'a@a.com', password: 'pass' });

    expect(res.body.userId).toBe(42);
    const decoded = jwt.verify(res.body.token, AUTH.JWT_SECRET);
    expect(decoded.userId).toBe(42);
    expect(decoded.role).toBe('user');
  });

  it('token role is "admin" when isadmin=true', async () => {
    const hash = await bcrypt.hash('pass', 1);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, isadmin: true, email: 'admin@a.com', password: hash }],
    });

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@a.com', password: 'pass' });

    const decoded = jwt.verify(res.body.token, AUTH.JWT_SECRET);
    expect(decoded.role).toBe('admin');
  });
});

// ─── POST /api/logout ───────────────────────────────────────────────────────

describe('POST /api/logout', () => {
  it('returns 401 without auth cookie', async () => {
    const res = await request(app).post('/api/logout').send({});
    expect(res.status).toBe(401);
  });

  it('blacklists token and blocks future access with the same token', async () => {
    const hash = await bcrypt.hash('Secret1!', 1);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 7, isadmin: false, email: 'alice@smvwa.local', password: hash }],
    });

    const loginRes = await request(app)
      .post('/api/login')
      .send({ email: 'alice@smvwa.local', password: 'Secret1!' });

    const authCookie = loginRes.headers['set-cookie'][0].split(';')[0];

    // 1) protected endpoint blacklist check before logout
    pool.query.mockResolvedValueOnce({ rows: [] });

    const beforeLogout = await request(app)
      .get('/api/protected')
      .set('Cookie', authCookie);
    expect(beforeLogout.status).toBe(200);

    // 2) logout: auth middleware blacklist check + blacklist insert
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const logoutRes = await request(app)
      .post('/api/logout')
      .set('Cookie', authCookie)
      .send({});
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // 3) protected endpoint blacklist check after logout -> blocked
    pool.query.mockResolvedValueOnce({ rows: [{ token_hash: 'revoked' }] });

    const afterLogout = await request(app)
      .get('/api/protected')
      .set('Cookie', authCookie);
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.error).toMatch(/revoked/i);
  });
});

// ─── POST /api/forgot-password ────────────────────────────────────────────────

describe('POST /api/forgot-password', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/forgot-password').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 404 when email is not registered', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/forgot-password').send({ email: 'ghost@x.com' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no account/i);
  });

  it('returns 200 with a secure debug_token on success', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // SELECT id FROM users
      .mockResolvedValueOnce({ rows: [] }) // DELETE old / expired password_resets
      .mockResolvedValueOnce({ rows: [] }); // INSERT password_resets

    const res = await request(app)
      .post('/api/forgot-password')
      .send({ email: 'real@x.com' });

    expect(res.status).toBe(200);
    expect(res.body.debug_token).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.expires_in_minutes).toBe(10);
  });

  it('debug_token is different on consecutive calls (random)', async () => {
    pool.query
      .mockResolvedValue({ rows: [{ id: 1 }] });

    const [r1, r2] = await Promise.all([
      request(app).post('/api/forgot-password').send({ email: 'x@x.com' }),
      request(app).post('/api/forgot-password').send({ email: 'x@x.com' }),
    ]);

    // Very unlikely they are equal (1/900000 chance)
    expect(r1.body.debug_token).not.toBe(r2.body.debug_token);
  });
});

// ─── POST /api/reset-password ─────────────────────────────────────────────────

describe('POST /api/reset-password', () => {
  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/reset-password')
      .send({ new_password: 'NewPass1!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when new_password is missing', async () => {
    const res = await request(app)
      .post('/api/reset-password')
      .send({ token: '123456' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when token is invalid (not in DB)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/reset-password')
      .send({ token: '000000', new_password: 'NewPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid|expired.*token/i);
  });

  it('returns 200 and success:true on valid token', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 11, user_id: 3 }] }) // SELECT id, user_id
      .mockResolvedValueOnce({ rows: [] }) // UPDATE users SET password
      .mockResolvedValueOnce({ rows: [] }); // DELETE used reset token(s)

    const res = await request(app)
      .post('/api/reset-password')
      .send({ token: 'a'.repeat(64), new_password: 'NewSecure1!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when token exists but is expired', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/reset-password')
      .send({ token: 'b'.repeat(64), new_password: 'NewPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired|invalid/i);
  });
});
