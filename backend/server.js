require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, ensureDb, auth, wrap, JWT_SECRET } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

const origins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
app.use(cors({ origin: origins.includes('*') ? true : origins }));
// Ảnh phiếu InBody gửi lên dạng base64 nên đường dẫn /api/ai cho phép body lớn hơn
app.use('/api/ai', express.json({ limit: '5mb' }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => res.json({ ok: true, name: 'routine-api' }));
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((req, res, next) => {
  ensureDb().then(() => next(), (e) => {
    console.error('Không khởi tạo được DB:', e.message);
    res.status(503).json({ error: 'Cơ sở dữ liệu chưa sẵn sàng, thử lại sau ít giây' });
  });
});

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

app.use('/api', require('./routes/habits'));
app.use('/api', require('./routes/life'));
app.use('/api', require('./routes/ai'));
app.use('/api', require('./routes/coach'));

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
