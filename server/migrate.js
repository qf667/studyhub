// Run this once to initialize the Supabase PostgreSQL schema
// Usage: node migrate.js
// Requires: DATABASE_URL environment variable

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    console.error('Set it in .env file or as system environment variable');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema-pg.sql'), 'utf-8');
    const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        console.log('OK:', stmt.substring(0, 60) + '...');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('SKIP (exists):', stmt.substring(0, 60) + '...');
        } else {
          console.error('ERROR:', err.message);
        }
      }
    }

    console.log('\nMigration complete!');
    // Verify admin user
    const res = await pool.query("SELECT id, username, role FROM users WHERE username='admin'");
    console.log('Admin user:', res.rows[0] || 'NOT FOUND');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
