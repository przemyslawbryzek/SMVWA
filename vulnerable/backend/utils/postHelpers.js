const pool = require('../db/pool');

/**
 * Fetches follower and following counts for a given user ID.
 *
 * @param {number|string} userId
 * @returns {Promise<{followers_count: string, following_count: string}>}
 */
async function getFollowCounts(userId) {
  const [followersResult, followingResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM followers WHERE following_id = ${userId}`),
    pool.query(`SELECT COUNT(*) FROM followers WHERE follower_id = ${userId}`),
  ]);
  return {
    followers_count: followersResult.rows[0].count,
    following_count: followingResult.rows[0].count,
  };
}

/**
 * Enriches a list of raw post rows with author info, interaction counts,
 * per-user like/repost state, and cited-post data.
 *
 * All DB queries are run in parallel via Promise.all to avoid N+1 queries.
 *
 * @param {object[]} posts   Raw rows from the posts table
 * @param {number|null} userId  ID of the currently authenticated user (or null)
 * @returns {Promise<object[]>} Enriched post objects
 */
async function enrichPosts(posts, userId = null) {
  if (!posts || posts.length === 0) {return [];}

  const postIds = posts.map(p => p.id);
  const userIds = [...new Set(posts.map(p => p.user_id))];
  const citationIds = posts.map(p => p.citation_id).filter(Boolean);

  let authors, comments, likes, reposts, userLikes, userReposts, citations;
  try {
    [authors, comments, likes, reposts, userLikes, userReposts, citations] = await Promise.all([
    pool.query(`SELECT id, username, email, profile_image FROM users WHERE id = ANY($1)`, [
      userIds,
    ]),
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
    userId
      ? pool.query(`SELECT post_id FROM likes WHERE user_id = $1 AND post_id = ANY($2)`, [
          userId,
          postIds,
        ])
      : { rows: [] },
    userId
      ? pool.query(`SELECT post_id FROM reposts WHERE user_id = $1 AND post_id = ANY($2)`, [
          userId,
          postIds,
        ])
      : { rows: [] },
    citationIds.length > 0
      ? pool.query(
          `SELECT p.id, p.content, p.attachments, p.created_at, u.id as user_id, u.username, u.email, u.profile_image FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ANY($1)`,
          [citationIds]
        )
      : { rows: [] },
    ]);
  } catch (err) {
    console.error('[enrichPosts] DB error:', err);
    throw err;
  }

  const authorsMap = new Map(authors.rows.map(a => [a.id, a]));
  const commentsMap = new Map(comments.rows.map(c => [c.parent_id, parseInt(c.count)]));
  const likesMap = new Map(likes.rows.map(l => [l.post_id, parseInt(l.count)]));
  const repostsMap = new Map(reposts.rows.map(r => [r.post_id, parseInt(r.count)]));
  const userLikesSet = new Set(userLikes.rows.map(l => l.post_id));
  const userRepostsSet = new Set(userReposts.rows.map(r => r.post_id));
  const citationsMap = new Map(
    citations.rows.map(c => [
      c.id,
      {
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        attachments: c.attachments || [],
        author: {
          id: c.user_id,
          username: c.username,
          email: c.email,
          profile_image: c.profile_image,
        },
      },
    ])
  );

  return posts.map(post => ({
    ...post,
    author: authorsMap.get(post.user_id) || { id: null, username: 'Unknown', profile_image: '' },
    comments_count: commentsMap.get(post.id) || 0,
    likes_count: likesMap.get(post.id) || 0,
    reposts_count: repostsMap.get(post.id) || 0,
    liked_by_user: userLikesSet.has(post.id),
    reposted_by_user: userRepostsSet.has(post.id),
    citation: citationsMap.get(post.citation_id) || null,
  }));
}

module.exports = { enrichPosts, getFollowCounts };
