

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  profile_image TEXT DEFAULT 'https://img.icons8.com/?size=100&id=z-JBA_KtSkxG&format=png&color=000000',
  bio TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

 CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  parent_id INTEGER NULL,
  root_id INTEGER NULL,
  content TEXT NOT NULL,
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
    ON DELETE CASCADE
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