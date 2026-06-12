-- StudyHub PostgreSQL Schema (Supabase compatible)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  real_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin','teacher','student')),
  class_name TEXT,
  status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  subject TEXT,
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_assignments (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  assigned_by INTEGER NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deadline TIMESTAMP,
  UNIQUE(course_id, student_id)
);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  extracted_text TEXT,
  upload_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homework (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP NOT NULL,
  time_limit INTEGER,
  allow_retry INTEGER DEFAULT 0,
  total_score REAL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','closed')),
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homework_questions (
  id SERIAL PRIMARY KEY,
  homework_id INTEGER NOT NULL REFERENCES homework(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  score REAL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  homework_id INTEGER NOT NULL REFERENCES homework(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  answers TEXT NOT NULL,
  score REAL,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted','graded')),
  started_at TIMESTAMP,
  submitted_at TIMESTAMP,
  graded_at TIMESTAMP,
  graded_by INTEGER
);

CREATE TABLE IF NOT EXISTS wrong_questions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  submission_id INTEGER,
  wrong_answer TEXT,
  is_mastered INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  course_id INTEGER,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed admin user (password: admin123)
INSERT INTO users (username, email, password_hash, real_name, role, status)
VALUES ('admin', 'admin@studyhub.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '系统管理员', 'admin', 1)
ON CONFLICT (username) DO NOTHING;
