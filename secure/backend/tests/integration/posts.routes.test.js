'use strict';

/**
 * Integration tests for backend/routes/posts (CRUD + actions)
 *
 * pg pool is fully mocked — no DB required.
 */

jest.mock('../../db/pool');

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');
const postsRouter = require('../../routes/posts');
const { AUTH } = require('../../config/constants');

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeToken(payload) {
  return jwt.sign(payload, AUTH.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
}

function mockAuthTokenNotRevoked() {
  pool.query.mockResolvedValueOnce({ rows: [] });
}

const USER_TOKEN   = makeToken({ userId: 1, role: 'user' });
const ADMIN_TOKEN  = makeToken({ userId: 99, role: 'admin' });
const OTHER_TOKEN  = makeToken({ userId: 2, role: 'user' });

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/posts', postsRouter);
  return app;
}

let app;

beforeAll(() => {
  app = buildApp();
});

afterEach(() => {
  jest.resetAllMocks();
});

beforeEach(() => {
  // Safe default for any unexpected pool.query call — avoids "Cannot read .rows of undefined"
  pool.query.mockResolvedValue({ rows: [] });
});

// ─── helpers : mock enrichPosts queries (7 parallel pool.query calls) ─────────

/**
 * enrichPosts makes conditional pool.query calls:
 *   authors, comments, likes, reposts  → always (4)
 *   userLikes, userReposts            → only when userId is provided (+2)
 *   citations                         → only when citationIds.length > 0 (+1)
 *
 * BASE_POST has citation_id=null so citations query is skipped.
 */
function mockEnrichPost(post, withUserId = true) {
  const empty = { rows: [] };
  // 1. authors
  pool.query.mockResolvedValueOnce({
    rows: [{ id: post.user_id, username: 'alice', email: 'a@a.com', profile_image: null }],
  });
  // 2. comments count
  pool.query.mockResolvedValueOnce(empty);
  // 3. likes count
  pool.query.mockResolvedValueOnce(empty);
  // 4. reposts count
  pool.query.mockResolvedValueOnce(empty);
  if (withUserId) {
    // 5. userLikes
    pool.query.mockResolvedValueOnce(empty);
    // 6. userReposts
    pool.query.mockResolvedValueOnce(empty);
  }
  // citations skipped — BASE_POST.citation_id = null
}

const BASE_POST = {
  id: 1,
  user_id: 1,
  content: 'Hello world',
  attachments: [],
  root_id: null,
  parent_id: null,
  citation_id: null,
  created_at: new Date().toISOString(),
};

// ─── POST /api/posts ──────────────────────────────────────────────────────────

describe('POST /api/posts', () => {
  it('returns 401 without auth cookie', async () => {
    const res = await request(app).post('/api/posts').send({ content: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when content is missing', async () => {
    mockAuthTokenNotRevoked();
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content/i);
  });

  it('returns 400 when content is empty string', async () => {
    mockAuthTokenNotRevoked();
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when content exceeds 5000 chars', async () => {
    mockAuthTokenNotRevoked();
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({ content: 'x'.repeat(5001) });
    expect(res.status).toBe(400);
  });

  it('returns 201 with post data on success', async () => {
    mockAuthTokenNotRevoked();
    pool.query.mockResolvedValueOnce({ rows: [BASE_POST] });

    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({ content: 'Hello world' });

    expect(res.status).toBe(201);
    expect(res.body.post).toBeDefined();
    expect(res.body.post.content).toBe('Hello world');
  });

  it('returns 500 when DB throws', async () => {
    mockAuthTokenNotRevoked();
    pool.query.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({ content: 'Test post' });

    expect(res.status).toBe(500);
  });
});

// ─── GET /api/posts/:id ───────────────────────────────────────────────────────

describe('GET /api/posts/:id', () => {
  it('returns 404 when post does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/posts/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 200 with enriched post data', async () => {
    mockAuthTokenNotRevoked();
    pool.query.mockResolvedValueOnce({ rows: [BASE_POST] }); // SELECT * FROM posts
    mockEnrichPost(BASE_POST, true); // userId=1 in USER_TOKEN cookie

    const res = await request(app)
      .get('/api/posts/1')
      .set('Cookie', `auth=${USER_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.post).toBeDefined();
    expect(res.body.post.content).toBe('Hello world');
  });

  it('is accessible without auth cookie (optionalAuth)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [BASE_POST] });
    mockEnrichPost(BASE_POST, false); // no userId — userLikes/Reposts skipped

    const res = await request(app).get('/api/posts/1');
    expect(res.status).toBe(200);
  });
});

// ─── PUT /api/posts/:id ───────────────────────────────────────────────────────

describe('PUT /api/posts/:id', () => {
  it('returns 401 without auth cookie', async () => {
    const res = await request(app).put('/api/posts/1').send({ content: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when updated content is empty', async () => {
    mockAuthTokenNotRevoked();
    const res = await request(app)
      .put('/api/posts/1')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({ content: '' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when post does not exist', async () => {
    mockAuthTokenNotRevoked();
    pool.query.mockResolvedValueOnce({ rows: [] }); // SELECT * FROM posts WHERE id=...

    const res = await request(app)
      .put('/api/posts/9999')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({ content: 'Updated content' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own the post', async () => {
    mockAuthTokenNotRevoked();
    pool.query.mockResolvedValueOnce({ rows: [{ ...BASE_POST, user_id: 999 }] });

    const res = await request(app)
      .put('/api/posts/1')
      .set('Cookie', `auth=${USER_TOKEN}`) // user_id=1, post owner=999
      .send({ content: 'Updated content' });

    expect(res.status).toBe(403);
  });

  it('returns 200 when owner updates the post', async () => {
    mockAuthTokenNotRevoked();
    const updatedPost = { ...BASE_POST, content: 'Updated content' };
    pool.query
      .mockResolvedValueOnce({ rows: [BASE_POST] })    // SELECT (ownership check)
      .mockResolvedValueOnce({ rows: [updatedPost] }); // UPDATE ... RETURNING

    const res = await request(app)
      .put('/api/posts/1')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({ content: 'Updated content', attachment_urls: [] });

    expect(res.status).toBe(200);
    expect(res.body.post.content).toBe('Updated content');
  });
});

// ─── DELETE /api/posts/:id ────────────────────────────────────────────────────

describe('DELETE /api/posts/:id', () => {
  it('returns 401 without auth cookie', async () => {
    const res = await request(app).delete('/api/posts/1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when post does not exist', async () => {
    mockAuthTokenNotRevoked();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/posts/9999')
      .set('Cookie', `auth=${USER_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own the post', async () => {
    mockAuthTokenNotRevoked();
    // user_id in token=1, post owner=999
    pool.query.mockResolvedValueOnce({ rows: [{ ...BASE_POST, user_id: 999 }] });

    const res = await request(app)
      .delete('/api/posts/1')
      .set('Cookie', `auth=${USER_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 when the owner deletes the post', async () => {
    mockAuthTokenNotRevoked();
    pool.query
      .mockResolvedValueOnce({ rows: [BASE_POST] })  // SELECT (ownership check)
      .mockResolvedValueOnce({ rows: [] });            // DELETE

    const res = await request(app)
      .delete('/api/posts/1')
      .set('Cookie', `auth=${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
