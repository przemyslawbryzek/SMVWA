#!/usr/bin/env node
/**
 * SMVWA — Database initialisation script
 *
 * Usage (inside running backend container):
 *   node db/init.js           — drop all tables, recreate schema, seed demo data
 *   node db/init.js --no-seed — drop all tables, recreate schema only
 *
 * Or via npm:
 *   npm run db:init
 *   npm run db:init -- --no-seed
 */

'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const NO_SEED = process.argv.includes('--no-seed');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'smvwa_user',
  password: process.env.DB_PASSWORD || 'smvwa_password',
  database: process.env.DB_NAME || 'smvwa_db',
});

// ─── helpers ────────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[init] ${msg}\n`);
}

async function exec(sql, params = []) {
  return client.query(sql, params);
}

function buildPublicTag(username, id) {
  const normalized = String(username || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24) || 'user';
  return `${normalized}_${id}`;
}

// ─── drop all tables (reverse FK order) ─────────────────────────────────────

async function dropAll() {
  log('Dropping existing tables…');
  await exec(`
    DROP TABLE IF EXISTS
      reported_posts,
      reported_users,
      revoked_tokens,
      password_resets,
      messages,
      likes,
      reposts,
      followers,
      posts,
      users
    CASCADE;
  `);
  log('All tables dropped.');
}

// ─── recreate schema from schema.sql ────────────────────────────────────────

async function applySchema() {
  log('Applying schema.sql…');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await exec(sql);
  log('Schema applied.');
}

// ─── seed demo data ──────────────────────────────────────────────────────────

const DEMO_USERS = [
  {
    username: 'admin',
    email: 'admin@smvwa.local',
    password: 'Admin1234!',
    bio: 'Platform administrator.',
    isAdmin: true,
  },
  {
    username: 'alice',
    email: 'alice@smvwa.local',
    password: 'Alice1234!',
    bio: 'Just a regular user on SMVWA. 👩‍💻',
    isAdmin: false,
  },
  {
    username: 'bob',
    email: 'bob@smvwa.local',
    password: 'Bob1234!',
    bio: 'Security enthusiast. CTF player.',
    isAdmin: false,
  },
  {
    username: 'mallory',
    email: 'mallory@smvwa.local',
    password: 'Mallory1234!',
    bio: "I'm just testing things… 😈",
    isAdmin: false,
  },
];

const DEMO_POSTS = [
  { username: 'alice', content: 'Hello SMVWA! First post 🎉' },
  { username: 'bob', content: 'https://owasp.org/www-project-top-ten/ checking the top ten security risks.' },
  { username: 'alice', content: 'Reminder: never trust user input. Ever.' },
  { username: 'mallory', content: "What's in /etc/passwd these days? Asking for a friend." },
  { username: 'bob', content: 'Just found a fun issue with the search endpoint…' },
  { username: 'admin', content: 'Welcome to SMVWA — a deliberately vulnerable social media app for security training.' },
];

async function seed() {
  log('Seeding demo users…');

  const userIds = {};

  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const res = await exec(
      `INSERT INTO users (username, email, password, bio, isadmin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [u.username, u.email, hash, u.bio, u.isAdmin],
    );
    const userId = res.rows[0].id;
    const publicTag = buildPublicTag(u.username, userId);
    await exec('UPDATE users SET public_tag = $1 WHERE id = $2', [publicTag, userId]);
    userIds[u.username] = userId;
    log(`  User created: ${u.username} (id=${userId}, tag=${publicTag}, admin=${u.isAdmin})`);
  }

  // alice follows bob, bob follows alice, mallory follows everyone
  const follows = [
    ['alice', 'bob'],
    ['bob', 'alice'],
    ['mallory', 'alice'],
    ['mallory', 'bob'],
    ['mallory', 'admin'],
  ];
  for (const [follower, following] of follows) {
    await exec(
      `INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)`,
      [userIds[follower], userIds[following]],
    );
  }
  log('  Follow relationships created.');

  log('Seeding demo posts…');
  const postIds = [];
  for (const p of DEMO_POSTS) {
    const res = await exec(
      `INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING id`,
      [userIds[p.username], p.content],
    );
    postIds.push(res.rows[0].id);
  }

  // alice likes bob's first post, bob likes alice's first post
  await exec(`INSERT INTO likes (post_id, user_id) VALUES ($1, $2)`, [postIds[1], userIds['alice']]);
  await exec(`INSERT INTO likes (post_id, user_id) VALUES ($1, $2)`, [postIds[0], userIds['bob']]);

  log('Seed complete.');
  log('');
  log('Demo credentials:');
  log('  admin   / Admin1234!  (admin=true)');
  log('  alice   / Alice1234!');
  log('  bob     / Bob1234!');
  log('  mallory / Mallory1234!');
}

// ─── main ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await client.connect();
    log('Connected to database.');

    await dropAll();
    await applySchema();

    if (NO_SEED) {
      log('Skipping seed (--no-seed flag).');
    } else {
      await seed();
    }

    log('Database initialisation finished successfully.');
  } catch (err) {
    process.stderr.write(`[init] ERROR: ${err.message}\n`);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
