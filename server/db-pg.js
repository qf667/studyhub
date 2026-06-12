const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool = null;

function getPool() {
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  return pool;
}

// Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function initDb() {
  const p = getPool();
  const schema = require('fs').readFileSync(
    require('path').join(__dirname, 'schema-pg.sql'), 'utf-8'
  );
  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await p.query(stmt);
    } catch (err) {
      // Ignore "already exists" errors during init
      if (!err.message.includes('already exists')) {
        console.error('Schema error:', err.message);
      }
    }
  }
  console.log('PostgreSQL schema initialized');
}

async function run(sql, params = []) {
  const converted = convertPlaceholders(sql);
  const result = await getPool().query(converted, params);
  return result.rowCount || 0;
}

async function getOne(sql, params = []) {
  const converted = convertPlaceholders(sql);
  const result = await getPool().query(converted, params);
  return result.rows[0] || null;
}

async function getAll(sql, params = []) {
  const converted = convertPlaceholders(sql);
  const result = await getPool().query(converted, params);
  return result.rows;
}

async function lastId() {
  const result = await getPool().query('SELECT LASTVAL() as id');
  return result.rows[0]?.id || 0;
}

// Compatibility: getDb returns the pool
async function getDb() {
  if (!pool) await initDb();
  return pool;
}

// No-op for PostgreSQL (auto-commits)
function saveDb() {}

module.exports = { getDb, run, getOne, getAll, lastId, saveDb };
