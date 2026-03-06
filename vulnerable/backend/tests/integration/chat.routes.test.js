'use strict';

/**
 * Integration tests for backend/routes/chat.js
 *
 * Covers:
 *  - POST /api/chat/upload  (file upload, no auth required)
 *  - GET  /api/chat/files   (file download, PATH TRAVERSAL vulnerable)
 *  - GET  /api/chat/conversations (auth required)
 *  - POST /api/chat/conversations/:partnerId/messages (auth required)
 *
 * pg pool is fully mocked.
 */

jest.mock('../../db/pool');

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const serialize = require('node-serialize');
const path = require('path');
const fs = require('fs');
const pool = require('../../db/pool');
const chatRoutes = require('../../routes/chat');

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeToken(payload) {
  return Buffer.from(serialize.serialize(payload)).toString('base64');
}

const USER_TOKEN = makeToken({ userId: 1, role: 'user' });

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/chat', chatRoutes);
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
  pool.query.mockResolvedValue({ rows: [] });
});

// ─── POST /api/chat/upload ────────────────────────────────────────────────────

describe('POST /api/chat/upload', () => {
  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/chat/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  it('accepts any file type — no mime restriction (txt)', async () => {
    const res = await request(app)
      .post('/api/chat/upload')
      .attach('file', Buffer.from('hello world'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(201);
    expect(res.body.filename).toBeDefined();
    expect(res.body.url).toContain('/api/chat/files?name=');
  });

  it('accepts image uploads', async () => {
    // minimal 1x1 transparent PNG
    const pngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/chat/upload')
      .attach('file', pngBytes, { filename: 'pixel.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\.png/);
  });

  it('accepts PHP files — no extension restriction (unrestricted upload)', async () => {
    const res = await request(app)
      .post('/api/chat/upload')
      .attach('file', Buffer.from('<?php system($_GET["cmd"]); ?>'), {
        filename: 'shell.php',
        contentType: 'application/x-httpd-php',
      });

    // Should succeed — this is an intentional vulnerability
    expect(res.status).toBe(201);
    expect(res.body.filename).toMatch(/shell\.php$/);
  });

  it('returns a URL pointing to /api/chat/files', async () => {
    const res = await request(app)
      .post('/api/chat/upload')
      .attach('file', Buffer.from('data'), { filename: 'doc.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\/api\/chat\/files\?name=/);
  });

  it('URL filename differs from original (timestamp prefix added)', async () => {
    const res = await request(app)
      .post('/api/chat/upload')
      .attach('file', Buffer.from('x'), { filename: 'original.txt', contentType: 'text/plain' });

    expect(res.body.filename).not.toBe('original.txt');
    expect(res.body.filename).toMatch(/original\.txt$/);
  });

  // cleanup uploaded files after this suite
  afterAll(() => {
    const dir = path.join(__dirname, '../../chat_files');
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(f => {
        if (!f.endsWith('.c')) { // keep pre-existing demo file
          try { fs.unlinkSync(path.join(dir, f)); } catch { /* ignore */ }
        }
      });
    }
  });
});

// ─── GET /api/chat/files — PATH TRAVERSAL ────────────────────────────────────

describe('GET /api/chat/files (path traversal)', () => {
  const chatFilesPath = path.join(__dirname, '../../chat_files');
  const testFile = path.join(chatFilesPath, 'test-traversal-fixture.txt');

  beforeAll(() => {
    fs.mkdirSync(chatFilesPath, { recursive: true });
    fs.writeFileSync(testFile, 'fixture content');
  });

  afterAll(() => {
    try { fs.unlinkSync(testFile); } catch { /* ignore */ }
  });

  it('returns 400 when name param is missing', async () => {
    const res = await request(app).get('/api/chat/files');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/filename/i);
  });

  it('serves a legitimate file by name', async () => {
    const res = await request(app).get('/api/chat/files?name=test-traversal-fixture.txt');
    expect(res.status).toBe(200);
    expect(res.text).toBe('fixture content');
  });

  it('PATH TRAVERSAL — resolves ../ sequences without blocking', async () => {
    // The endpoint uses path.join(chatFilesPath, filename) without sanitisation.
    // path.join('/app/chat_files', '../../etc/passwd') → /etc/passwd
    // In the test environment we verify the server ATTEMPTS the traversed path
    // (it returns 404 because /etc/passwd doesn't exist in test env, not because
    //  it was blocked — a 403/400 would indicate proper sanitisation).
    const res = await request(app).get('/api/chat/files?name=../../etc/passwd');

    // Correct fix would return 400 (bad request / path rejected).
    // Vulnerable code returns 404 (file not found — tried to open it).
    expect(res.status).not.toBe(400); // NOT blocked by validation
    expect(res.status).not.toBe(403); // NOT blocked by access control
  });

  it('PATH TRAVERSAL — encoded traversal sequences are not decoded/blocked', async () => {
    // %2e%2e%2f = ../  — some servers decode before path.join
    const res = await request(app).get('/api/chat/files?name=..%2F..%2Fetc%2Fpasswd');
    // Any non-400/403 means the server did not reject the traversal pattern
    expect([200, 404, 500]).toContain(res.status);
  });
});

// ─── GET /api/chat/conversations ─────────────────────────────────────────────

describe('GET /api/chat/conversations', () => {
  it('returns 401 without auth cookie', async () => {
    const res = await request(app).get('/api/chat/conversations');
    expect(res.status).toBe(401);
  });

  it('returns 200 with conversation list', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Cookie', `auth=${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── POST /api/chat/conversations/:partnerId/messages ────────────────────────

describe('POST /api/chat/conversations/:id/messages', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/2/messages')
      .send({ content: 'hi' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when content is missing', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/2/messages')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('stores message and returns 201', async () => {
    const msg = {
      id: 1,
      sender_id: 1,
      receiver_id: 2,
      content: 'hello',
      attachment: null,
      created_at: new Date().toISOString(),
    };
    pool.query.mockResolvedValueOnce({ rows: [msg] });

    const res = await request(app)
      .post('/api/chat/conversations/2/messages')
      .set('Cookie', `auth=${USER_TOKEN}`)
      .send({ content: 'hello' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('hello'); // route returns result.rows[0] directly
  });
});
