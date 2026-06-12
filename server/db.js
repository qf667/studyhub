const initSQL = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'studyhub.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSQL();
  let fileBuffer = null;
  if (fs.existsSync(DB_PATH)) {
    fileBuffer = fs.readFileSync(DB_PATH);
  }
  db = new SQL.Database(fileBuffer || undefined);

  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  createTables();
  seedAdmin();
  saveDb();

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    real_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin','teacher','student')),
    class_name TEXT,
    status INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    subject TEXT,
    teacher_id INTEGER NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
    start_date DATE,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS course_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deadline DATETIME,
    UNIQUE(course_id, student_id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    file_size INTEGER,
    extracted_text TEXT,
    upload_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (material_id) REFERENCES materials(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    material_id INTEGER,
    chapter_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('single_choice','multiple_choice','true_false','fill_blank','short_answer')),
    difficulty TEXT CHECK(difficulty IN ('easy','medium','hard')),
    content TEXT NOT NULL,
    options TEXT,
    answer TEXT NOT NULL,
    explanation TEXT,
    knowledge_point TEXT,
    score REAL DEFAULT 1.0,
    source TEXT DEFAULT 'manual' CHECK(source IN ('ai','manual')),
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS homework (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    deadline DATETIME NOT NULL,
    time_limit INTEGER,
    allow_retry INTEGER DEFAULT 0,
    total_score REAL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','closed')),
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS homework_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    homework_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    score REAL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (homework_id) REFERENCES homework(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    homework_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    answers TEXT NOT NULL,
    score REAL,
    status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted','graded')),
    started_at DATETIME,
    submitted_at DATETIME,
    graded_at DATETIME,
    graded_by INTEGER,
    FOREIGN KEY (homework_id) REFERENCES homework(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS wrong_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    submission_id INTEGER,
    wrong_answer TEXT,
    is_mastered INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function seedAdmin() {
  const existing = db.exec("SELECT id FROM users WHERE username='admin'");
  if (existing.length > 0 && existing[0].values.length > 0) return;

  const hash = bcrypt.hashSync('admin123', 10);
  db.run(
    `INSERT INTO users (username, email, password_hash, real_name, role, status)
     VALUES ('admin', 'admin@studyhub.com', ?, '系统管理员', 'admin', 1)`,
    [hash]
  );
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return db.getRowsModified();
}

function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function lastId() {
  const result = db.exec("SELECT last_insert_rowid() as id");
  return result[0]?.values[0][0] || 0;
}

module.exports = { getDb, run, getOne, getAll, lastId, saveDb };
