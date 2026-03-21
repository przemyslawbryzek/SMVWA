const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'smvwa_user',
  password: process.env.DB_PASSWORD || 'smvwa_password',
  database: process.env.DB_NAME || 'smvwa_db',
});

// pg.Pool handles reconnection automatically — do not exit the process on transient errors.
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
