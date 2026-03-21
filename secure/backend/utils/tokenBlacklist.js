const crypto = require('crypto');
const pool = require('../db/pool');

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function blacklistToken(token, expUnixSeconds) {
  if (!token || typeof token !== 'string') {
    return;
  }

  const expiresAt = Number.isFinite(expUnixSeconds)
    ? new Date(expUnixSeconds * 1000)
    : new Date(Date.now() + DEFAULT_TTL_MS);

  const sql = `
    INSERT INTO revoked_tokens (token_hash, expires_at)
    VALUES ($1, $2)
    ON CONFLICT (token_hash)
    DO UPDATE SET
      expires_at = GREATEST(revoked_tokens.expires_at, EXCLUDED.expires_at),
      revoked_at = NOW()
  `;
  await pool.query(sql, [hashToken(token), expiresAt]);
}

async function isTokenBlacklisted(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const sql = `
    WITH cleanup AS (
      DELETE FROM revoked_tokens WHERE expires_at <= NOW()
    )
    SELECT 1
    FROM revoked_tokens
    WHERE token_hash = $1 AND expires_at > NOW()
    LIMIT 1
  `;
  const result = await pool.query(sql, [hashToken(token)]);
  return result.rows.length > 0;
}

async function _resetTokenBlacklist() {
  await pool.query('DELETE FROM revoked_tokens');
}

module.exports = {
  blacklistToken,
  isTokenBlacklisted,
  _resetTokenBlacklist,
};