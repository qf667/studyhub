// Auto-detect database: PostgreSQL (production) or SQLite (local dev)
// If DATABASE_URL is set, use PostgreSQL; otherwise use SQLite

if (process.env.DATABASE_URL) {
  module.exports = require('./db-pg');
} else {
  module.exports = require('./db-sqlite');
}
