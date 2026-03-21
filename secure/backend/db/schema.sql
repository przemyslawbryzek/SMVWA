

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  public_tag VARCHAR(64) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  profile_image TEXT DEFAULT 'https://img.icons8.com/?size=100&id=z-JBA_KtSkxG&format=png&color=000000',
  background_image TEXT DEFAULT NULL,
  bio TEXT DEFAULT '',
  isAdmin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  parent_id INTEGER NULL,
  root_id INTEGER NULL,
  content TEXT NOT NULL,
  attachments TEXT[],
  citation_id INTEGER DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_posts_parent
    FOREIGN KEY (parent_id)
    REFERENCES posts (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_posts_root
    FOREIGN KEY (root_id)
    REFERENCES posts (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_posts_citation
    FOREIGN KEY (citation_id)
    REFERENCES posts (id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_likes_post
    FOREIGN KEY (post_id)
    REFERENCES posts (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_likes_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT uq_likes UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS followers (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_followers_follower
    FOREIGN KEY (follower_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_followers_following
    FOREIGN KEY (following_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT uq_followers UNIQUE (follower_id, following_id),
  CONSTRAINT chk_not_self_follow CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS reposts (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_reposts_post
    FOREIGN KEY (post_id)
    REFERENCES posts (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reposts_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT uq_reposts UNIQUE (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS reported_posts (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_reported_posts_post
    FOREIGN KEY (post_id)
    REFERENCES posts (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reported_posts_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT uq_reported_posts UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS reported_users (
  id SERIAL PRIMARY KEY,
  reported_user_id INTEGER NOT NULL,
  reporting_user_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_reported_users_reported
    FOREIGN KEY (reported_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reported_users_reporting
    FOREIGN KEY (reporting_user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT uq_reported_users UNIQUE (reported_user_id, reporting_user_id),
  CONSTRAINT chk_not_self_report CHECK (reported_user_id <> reporting_user_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  token_hash VARCHAR(64) PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  attachment TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_id)
    REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver
    FOREIGN KEY (receiver_id)
    REFERENCES users (id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id       ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id     ON posts (parent_id);
CREATE INDEX IF NOT EXISTS idx_posts_root_id       ON posts (root_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id       ON likes (post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id       ON likes (user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id     ON reposts (post_id);
CREATE INDEX IF NOT EXISTS idx_reposts_user_id     ON reposts (user_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower  ON followers (follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers (following_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender     ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver   ON messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets (expires_at);

