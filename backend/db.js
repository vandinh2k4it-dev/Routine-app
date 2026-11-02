const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
if (IS_PROD && !process.env.JWT_SECRET) throw new Error('Thiếu biến môi trường JWT_SECRET');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Pool nhỏ: trên Vercel mỗi instance chỉ cần vài kết nối, đóng sớm để không giữ kết nối của Neon.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
    ? { rejectUnauthorized: false }
    : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
});
pool.on('error', (e) => console.error('Pool error:', e.message));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lịch & thói quen. kind='block': có giờ trên timeline; kind='habit': chỉ tick mỗi ngày.
-- days là bitmask (bit0 = Thứ hai … bit6 = Chủ nhật); once_on: việc chỉ diễn ra một ngày.
CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  start_time TEXT,
  end_time TEXT,
  days SMALLINT NOT NULL DEFAULT 127,
  remind_before INT,
  note TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE habits ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'block';
ALTER TABLE habits ADD COLUMN IF NOT EXISTS once_on DATE;
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);

CREATE TABLE IF NOT EXISTS habit_logs (
  habit_id INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  done_on DATE NOT NULL,
  PRIMARY KEY (habit_id, done_on)
);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON habit_logs(user_id, done_on);

-- Sửa riêng một ngày cho việc lặp lại: bỏ qua hoặc dời giờ
CREATE TABLE IF NOT EXISTS habit_exceptions (
  habit_id INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  on_date DATE NOT NULL,
  skipped BOOLEAN NOT NULL DEFAULT false,
  start_time TEXT,
  end_time TEXT,
  PRIMARY KEY (habit_id, on_date)
);

CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'
);

-- Thể hình
CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  done_on DATE NOT NULL,
  name TEXT NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, done_on);
CREATE TABLE IF NOT EXISTS workout_sets (
  id SERIAL PRIMARY KEY,
  workout_id INT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  set_no INT NOT NULL DEFAULT 1,
  reps INT NOT NULL DEFAULT 0,
  weight NUMERIC NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sets_workout ON workout_sets(workout_id);

CREATE TABLE IF NOT EXISTS body_metrics (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  on_date DATE NOT NULL,
  weight NUMERIC, body_fat NUMERIC, waist NUMERIC, chest NUMERIC, arm NUMERIC, shoulder NUMERIC,
  PRIMARY KEY (user_id, on_date)
);
CREATE TABLE IF NOT EXISTS nutrition_logs (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  on_date DATE NOT NULL,
  calories NUMERIC, protein NUMERIC, carbs NUMERIC, fat NUMERIC, water NUMERIC,
  PRIMARY KEY (user_id, on_date)
);
CREATE TABLE IF NOT EXISTS sleep_logs (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  on_date DATE NOT NULL,
  bedtime TEXT, wake_time TEXT,
  PRIMARY KEY (user_id, on_date)
);

-- TOEIC
CREATE TABLE IF NOT EXISTS vocab (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  example TEXT,
  box INT NOT NULL DEFAULT 0,
  next_review DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_vocab_user ON vocab(user_id, next_review);
CREATE TABLE IF NOT EXISTS mock_tests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taken_on DATE NOT NULL,
  listening INT NOT NULL,
  reading INT NOT NULL,
  note TEXT
);

-- Giờ học / giờ làm (Pomodoro, TOEIC, Backend, AI, freelancer…)
CREATE TABLE IF NOT EXISTS time_logs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_on DATE NOT NULL,
  minutes INT NOT NULL CHECK (minutes > 0),
  kind TEXT NOT NULL,
  note TEXT,
  project_id INT
);
CREATE INDEX IF NOT EXISTS idx_time_user_date ON time_logs(user_id, logged_on);

-- Công việc
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client TEXT,
  kind TEXT NOT NULL DEFAULT 'freelance',
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT
);
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 2,
  due_on DATE,
  status TEXT NOT NULL DEFAULT 'todo',
  note TEXT,
  done_on DATE
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, status);
CREATE TABLE IF NOT EXISTS income (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INT REFERENCES projects(id) ON DELETE SET NULL,
  received_on DATE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  note TEXT
);

CREATE TABLE IF NOT EXISTS week_reviews (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  note TEXT,
  next_goals TEXT,
  PRIMARY KEY (user_id, week_start)
);
`;

// Khởi tạo bảng: chạy lười, đúng một lần cho mỗi instance. Bỏ qua nếu database đã đủ bảng/cột mới nhất.
// Dùng khóa theo giao dịch (không dùng khóa theo phiên) vì Neon pooler là PgBouncer chế độ transaction.
let dbReady = null;
async function initDb() {
  const chk = await pool.query(`
    SELECT to_regclass('public.week_reviews') IS NOT NULL
       AND to_regclass('public.users') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'once_on') AS ok`);
  if (chk.rows[0].ok) return;
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(727001)');
    await c.query(SCHEMA);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
function ensureDb() {
  if (!dbReady) {
    dbReady = initDb().catch((e) => {
      dbReady = null;
      throw e;
    });
  }
  return dbReady;
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
  }
}

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

// Ngày hợp lệ thật (từ chối 2026-11-31: JS tự cuốn sang tháng sau nhưng Postgres thì báo lỗi)
const isDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
};
const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '');

module.exports = { pool, ensureDb, auth, wrap, isDate, isTime, JWT_SECRET };
