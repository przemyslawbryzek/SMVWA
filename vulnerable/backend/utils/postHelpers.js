const pool = require('../db/pool');

async function enrichPosts(posts, userId = null) {
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map(p => p.id);

  const [authors, comments, likes, reposts, userLikes, userReposts] = await Promise.all([
    pool.query(
      `SELECT id, username, email, profile_image FROM users WHERE id = ANY($1)`,
      [posts.map(p => p.user_id)]
    ),
    pool.query(
      `SELECT parent_id, COUNT(*) as count FROM posts WHERE parent_id = ANY($1) GROUP BY parent_id`,
      [postIds]
    ),
    pool.query(
      `SELECT post_id, COUNT(*) as count FROM likes WHERE post_id = ANY($1) GROUP BY post_id`,
      [postIds]
    ),
    pool.query(
      `SELECT post_id, COUNT(*) as count FROM reposts WHERE post_id = ANY($1) GROUP BY post_id`,
      [postIds]
    ),
    userId ? pool.query(
      `SELECT post_id FROM likes WHERE user_id = $1 AND post_id = ANY($2)`,
      [userId, postIds]
    ) : { rows: [] },
    userId ? pool.query(
      `SELECT post_id FROM reposts WHERE user_id = $1 AND post_id = ANY($2)`,
      [userId, postIds]
    ) : { rows: [] }
  ]);

  const authorsMap = new Map(authors.rows.map(a => [a.id, a]));
  const commentsMap = new Map(comments.rows.map(c => [c.parent_id, parseInt(c.count)]));
  const likesMap = new Map(likes.rows.map(l => [l.post_id, parseInt(l.count)]));
  const repostsMap = new Map(reposts.rows.map(r => [r.post_id, parseInt(r.count)]));
  const userLikesSet = new Set(userLikes.rows.map(l => l.post_id));
  const userRepostsSet = new Set(userReposts.rows.map(r => r.post_id));

  return posts.map(post => ({
    ...post,
    author: authorsMap.get(post.user_id) || { id: null, username: 'Unknown', profile_image: '' },
    comments_count: commentsMap.get(post.id) || 0,
    likes_count: likesMap.get(post.id) || 0,
    reposts_count: repostsMap.get(post.id) || 0,
    liked_by_user: userLikesSet.has(post.id),
    reposted_by_user: userRepostsSet.has(post.id)
  }));
}

module.exports = { enrichPosts };
