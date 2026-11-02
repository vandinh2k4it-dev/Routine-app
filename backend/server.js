require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;
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

const origins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
app.use(cors({ origin: origins.includes('*') ? true : origins }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => res.json({ ok: true, name: 'routine-api' }));
app.get('/health', (_req, res) => res.json({ ok: true }));

// Khởi tạo bảng: chạy lười, đúng một lần cho mỗi instance.
let dbReady = null;
function ensureDb() {
  if (!dbReady) {
    dbReady = initDb().catch((e) => {
      dbReady = null;
      throw e;
    });
  }
  return dbReady;
}
app.use((req, res, next) => {
  ensureDb().then(() => next(), (e) => {
    console.error('Không khởi tạo được DB:', e.message);
    res.status(503).json({ error: 'Cơ sở dữ liệu chưa sẵn sàng, thử lại sau ít giây' });
  });
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    -- Một hoạt động trong lịch: giờ bắt đầu/kết thúc dạng 'HH:MM', days là bitmask (bit0 = Thứ hai … bit6 = Chủ nhật)
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
    CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
    CREATE TABLE IF NOT EXISTS habit_logs (
      habit_id INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      done_on DATE NOT NULL,
      PRIMARY KEY (habit_id, done_on)
    );
    CREATE INDEX IF NOT EXISTS idx_logs_user_date ON habit_logs(user_id, done_on);
  `);
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

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '');
const USER_COLS = 'id, username, display_name, avatar';
const AVATAR_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const AVATAR_MAX = 400000;

function cleanName(v) {
  if (v === null || v === undefined) return { value: null };
  if (typeof v !== 'string') return { error: 'Tên hiển thị không hợp lệ' };
  const s = v.trim().replace(/\s+/g, ' ');
  if (s.length > 40) return { error: 'Tên hiển thị tối đa 40 ký tự' };
  return { value: s || null };
}
function cleanAvatar(v) {
  if (v === null || v === undefined || v === '') return { value: null };
  if (typeof v !== 'string' || v.length > AVATAR_MAX || !AVATAR_RE.test(v)) return { error: 'Ảnh đại diện không hợp lệ hoặc quá lớn' };
  return { value: v };
}

// ---------- Auth ----------
app.post('/api/auth/register', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || username.trim().length < 3) return res.status(400).json({ error: 'Tên đăng nhập tối thiểu 3 ký tự' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
  const nm = cleanName(req.body.display_name);
  if (nm.error) return res.status(400).json({ error: nm.error });
  const av = cleanAvatar(req.body.avatar);
  if (av.error) return res.status(400).json({ error: av.error });
  const name = username.trim().toLowerCase();
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await pool.query(
      `INSERT INTO users (username, password_hash, display_name, avatar) VALUES ($1, $2, $3, $4) RETURNING ${USER_COLS}`,
      [name, hash, nm.value, av.value]
    );
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
    throw e;
  }
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const r = await pool.query('SELECT * FROM users WHERE username = $1', [(username || '').trim().toLowerCase()]);
  const u = r.rows[0];
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  const token = jwt.sign({ id: u.id, username: u.username }, JWT_SECRET, { expiresIn: '90d' });
  res.json({ token, user: { id: u.id, username: u.username, display_name: u.display_name, avatar: u.avatar } });
}));

// ---------- Hồ sơ ----------
app.get('/api/me', auth, wrap(async (req, res) => {
  const r = await pool.query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [req.user.id]);
  if (!r.rows[0]) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
  res.json(r.rows[0]);
}));

app.put('/api/me', auth, wrap(async (req, res) => {
  const body = req.body || {};
  const sets = [];
  const params = [];
  if ('display_name' in body) {
    const nm = cleanName(body.display_name);
    if (nm.error) return res.status(400).json({ error: nm.error });
    params.push(nm.value); sets.push(`display_name = $${params.length}`);
  }
  if ('avatar' in body) {
    const av = cleanAvatar(body.avatar);
    if (av.error) return res.status(400).json({ error: av.error });
    params.push(av.value); sets.push(`avatar = $${params.length}`);
  }
  if (!sets.length) return res.status(400).json({ error: 'Không có gì để cập nhật' });
  params.push(req.user.id);
  const r = await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${USER_COLS}`, params);
  res.json(r.rows[0]);
}));

// ---------- Hoạt động trong lịch ----------
const HCOLS = `id, title, category, start_time, end_time, days, remind_before, note,
  to_char(start_date, 'YYYY-MM-DD') AS start_date, archived`;

function readHabit(req, res) {
  const b = req.body || {};
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) { res.status(400).json({ error: 'Thiếu tên hoạt động' }); return null; }
  if (title.length > 80) { res.status(400).json({ error: 'Tên hoạt động tối đa 80 ký tự' }); return null; }
  const start = b.start_time || null;
  const end = b.end_time || null;
  if (start && !isTime(start)) { res.status(400).json({ error: 'Giờ bắt đầu không hợp lệ' }); return null; }
  if (end && !isTime(end)) { res.status(400).json({ error: 'Giờ kết thúc không hợp lệ' }); return null; }
  if (end && !start) { res.status(400).json({ error: 'Cần giờ bắt đầu trước khi đặt giờ kết thúc' }); return null; }
  const days = parseInt(b.days, 10);
  if (!Number.isInteger(days) || days < 1 || days > 127) { res.status(400).json({ error: 'Chọn ít nhất một ngày trong tuần' }); return null; }
  let remind = null;
  if (b.remind_before !== null && b.remind_before !== undefined && b.remind_before !== '') {
    remind = parseInt(b.remind_before, 10);
    if (!Number.isInteger(remind) || remind < 0 || remind > 1440) { res.status(400).json({ error: 'Thời gian nhắc không hợp lệ' }); return null; }
    if (!start) { res.status(400).json({ error: 'Cần đặt giờ bắt đầu để nhắc nhở' }); return null; }
  }
  const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 300) : null;
  const category = typeof b.category === 'string' && b.category.length <= 20 ? b.category : 'other';
  const start_date = isDate(b.start_date) ? b.start_date : null;
  return { title, category, start, end, days, remind, note, start_date };
}

app.get('/api/habits', auth, wrap(async (req, res) => {
  const r = await pool.query(
    `SELECT ${HCOLS} FROM habits WHERE user_id = $1 AND NOT archived ORDER BY start_time NULLS LAST, id`,
    [req.user.id]
  );
  res.json(r.rows);
}));

app.post('/api/habits', auth, wrap(async (req, res) => {
  const h = readHabit(req, res);
  if (!h) return;
  const r = await pool.query(
    `INSERT INTO habits (user_id, title, category, start_time, end_time, days, remind_before, note, start_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9::date, CURRENT_DATE)) RETURNING ${HCOLS}`,
    [req.user.id, h.title, h.category, h.start, h.end, h.days, h.remind, h.note, h.start_date]
  );
  res.json(r.rows[0]);
}));

app.put('/api/habits/:id', auth, wrap(async (req, res) => {
  const h = readHabit(req, res);
  if (!h) return;
  const r = await pool.query(
    `UPDATE habits SET title=$1, category=$2, start_time=$3, end_time=$4, days=$5, remind_before=$6, note=$7
     WHERE id=$8 AND user_id=$9 RETURNING ${HCOLS}`,
    [h.title, h.category, h.start, h.end, h.days, h.remind, h.note, req.params.id, req.user.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json(r.rows[0]);
}));

app.delete('/api/habits/:id', auth, wrap(async (req, res) => {
  await pool.query('DELETE FROM habits WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

// ---------- Hoàn thành mỗi ngày ----------
// GET /api/logs?from&to -> [{ habit_id, done_on }]
app.get('/api/logs', auth, wrap(async (req, res) => {
  const { from, to } = req.query;
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: 'Thiếu from/to' });
  const r = await pool.query(
    `SELECT habit_id, to_char(done_on, 'YYYY-MM-DD') AS done_on
     FROM habit_logs WHERE user_id=$1 AND done_on BETWEEN $2 AND $3`,
    [req.user.id, from, to]
  );
  res.json(r.rows);
}));

// PUT /api/logs { habit_id, date, done } -> đánh dấu / bỏ đánh dấu hoàn thành
app.put('/api/logs', auth, wrap(async (req, res) => {
  const { habit_id, date, done } = req.body || {};
  const hid = parseInt(habit_id, 10);
  if (!Number.isInteger(hid) || !isDate(date)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  if (done) {
    const r = await pool.query(
      `INSERT INTO habit_logs (habit_id, user_id, done_on)
       SELECT id, user_id, $2 FROM habits WHERE id=$1 AND user_id=$3
       ON CONFLICT DO NOTHING`,
      [hid, date, req.user.id]
    );
    // rowCount = 0 vừa có thể là đã tick rồi, vừa có thể là hoạt động không thuộc người dùng: kiểm tra riêng
    if (!r.rowCount) {
      const own = await pool.query('SELECT 1 FROM habits WHERE id=$1 AND user_id=$2', [hid, req.user.id]);
      if (!own.rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
    }
  } else {
    await pool.query('DELETE FROM habit_logs WHERE habit_id=$1 AND user_id=$2 AND done_on=$3', [hid, req.user.id, date]);
  }
  res.json({ ok: true });
}));

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu gửi lên quá lớn (ảnh đại diện quá nặng)' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

if (require.main === module) {
  ensureDb()
    .then(() => app.listen(PORT, () => console.log(`API chạy tại cổng ${PORT}`)))
    .catch((e) => {
      console.error('Không khởi tạo được DB:', e.message);
      process.exit(1);
    });
}

module.exports = app;
