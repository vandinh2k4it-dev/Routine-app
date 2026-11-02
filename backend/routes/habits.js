const express = require('express');
const { pool, auth, wrap, isDate, isTime } = require('../db');
const { resource } = require('../crud');

const r = express.Router();

const HCOLS = `id, title, category, kind, start_time, end_time, days, remind_before, note,
  to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(once_on, 'YYYY-MM-DD') AS once_on, archived`;

// Trả { h } hoặc { error }
function readHabit(b) {
  b = b || {};
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) return { error: 'Thiếu tên hoạt động' };
  if (title.length > 80) return { error: 'Tên hoạt động tối đa 80 ký tự' };
  const kind = b.kind === 'habit' ? 'habit' : 'block';
  const start = kind === 'block' ? b.start_time || null : null;
  const end = kind === 'block' ? b.end_time || null : null;
  if (start && !isTime(start)) return { error: 'Giờ bắt đầu không hợp lệ' };
  if (end && !isTime(end)) return { error: 'Giờ kết thúc không hợp lệ' };
  if (end && !start) return { error: 'Cần giờ bắt đầu trước khi đặt giờ kết thúc' };
  if (start && end && end <= start) return { error: 'Giờ kết thúc phải sau giờ bắt đầu' };
  const once_on = b.once_on || null;
  if (once_on && !isDate(once_on)) return { error: 'Ngày không hợp lệ' };
  const days = once_on ? 127 : parseInt(b.days, 10);
  if (!Number.isInteger(days) || days < 1 || days > 127) return { error: 'Chọn ít nhất một ngày trong tuần' };
  let remind = null;
  if (b.remind_before !== null && b.remind_before !== undefined && b.remind_before !== '') {
    remind = parseInt(b.remind_before, 10);
    if (!Number.isInteger(remind) || remind < 0 || remind > 1440) return { error: 'Thời gian nhắc không hợp lệ' };
    if (!start) return { error: 'Cần đặt giờ bắt đầu để nhắc nhở' };
  }
  const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 300) : null;
  const category = typeof b.category === 'string' && b.category.length <= 20 ? b.category : 'other';
  const start_date = isDate(b.start_date) ? b.start_date : null;
  return { h: { title, category, kind, start, end, days, remind, note, start_date, once_on } };
}

const INSERT = `INSERT INTO habits (user_id, title, category, kind, start_time, end_time, days, remind_before, note, start_date, once_on)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::date, CURRENT_DATE), $11) RETURNING ${HCOLS}`;
const insertArgs = (uid, h) => [uid, h.title, h.category, h.kind, h.start, h.end, h.days, h.remind, h.note, h.start_date, h.once_on];

r.get('/habits', auth, wrap(async (req, res) => {
  const q = await pool.query(
    `SELECT ${HCOLS} FROM habits WHERE user_id = $1 AND NOT archived ORDER BY start_time NULLS LAST, id`,
    [req.user.id]
  );
  res.json(q.rows);
}));

r.post('/habits', auth, wrap(async (req, res) => {
  const { h, error } = readHabit(req.body);
  if (error) return res.status(400).json({ error });
  res.json((await pool.query(INSERT, insertArgs(req.user.id, h))).rows[0]);
}));

// Thêm nhiều hoạt động một lúc (lịch mẫu, áp dụng lịch mẫu cho một ngày)
r.post('/habits/bulk', auth, wrap(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length || items.length > 60) return res.status(400).json({ error: 'Danh sách không hợp lệ' });
  const parsed = [];
  for (const it of items) {
    const { h, error } = readHabit(it);
    if (error) return res.status(400).json({ error: `${it?.title || 'Mục'}: ${error}` });
    parsed.push(h);
  }
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const out = [];
    for (const h of parsed) out.push((await c.query(INSERT, insertArgs(req.user.id, h))).rows[0]);
    await c.query('COMMIT');
    res.json(out);
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}));

r.put('/habits/:id', auth, wrap(async (req, res) => {
  const { h, error } = readHabit(req.body);
  if (error) return res.status(400).json({ error });
  const q = await pool.query(
    `UPDATE habits SET title=$1, category=$2, kind=$3, start_time=$4, end_time=$5, days=$6, remind_before=$7, note=$8, once_on=$9
     WHERE id=$10 AND user_id=$11 RETURNING ${HCOLS}`,
    [h.title, h.category, h.kind, h.start, h.end, h.days, h.remind, h.note, h.once_on, req.params.id, req.user.id]
  );
  if (!q.rows[0]) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json(q.rows[0]);
}));

r.delete('/habits/:id', auth, wrap(async (req, res) => {
  await pool.query('DELETE FROM habits WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

// ---------- Hoàn thành mỗi ngày ----------
r.get('/logs', auth, wrap(async (req, res) => {
  const { from, to } = req.query;
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: 'Thiếu from/to' });
  const q = await pool.query(
    `SELECT habit_id, to_char(done_on, 'YYYY-MM-DD') AS done_on
     FROM habit_logs WHERE user_id=$1 AND done_on BETWEEN $2 AND $3`,
    [req.user.id, from, to]
  );
  res.json(q.rows);
}));

r.put('/logs', auth, wrap(async (req, res) => {
  const { habit_id, date, done } = req.body || {};
  const hid = parseInt(habit_id, 10);
  if (!Number.isInteger(hid) || !isDate(date)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  const own = await pool.query('SELECT 1 FROM habits WHERE id=$1 AND user_id=$2', [hid, req.user.id]);
  if (!own.rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
  if (done) {
    await pool.query('INSERT INTO habit_logs (habit_id, user_id, done_on) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [hid, req.user.id, date]);
  } else {
    await pool.query('DELETE FROM habit_logs WHERE habit_id=$1 AND user_id=$2 AND done_on=$3', [hid, req.user.id, date]);
  }
  res.json({ ok: true });
}));

// ---------- Sửa riêng một ngày ----------
r.get('/habit-exceptions', auth, wrap(async (req, res) => {
  const { from, to } = req.query;
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: 'Thiếu from/to' });
  const q = await pool.query(
    `SELECT habit_id, to_char(on_date, 'YYYY-MM-DD') AS on_date, skipped, start_time, end_time
     FROM habit_exceptions WHERE user_id=$1 AND on_date BETWEEN $2 AND $3`,
    [req.user.id, from, to]
  );
  res.json(q.rows);
}));

// PUT { habit_id, date, skipped?, start_time?, end_time? } ; DELETE ?habit_id&date để trả về lịch gốc
r.put('/habit-exceptions', auth, wrap(async (req, res) => {
  const b = req.body || {};
  const hid = parseInt(b.habit_id, 10);
  if (!Number.isInteger(hid) || !isDate(b.date)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  const skipped = !!b.skipped;
  const start = skipped ? null : b.start_time || null;
  const end = skipped ? null : b.end_time || null;
  if ((start && !isTime(start)) || (end && !isTime(end))) return res.status(400).json({ error: 'Giờ không hợp lệ' });
  if (end && !start) return res.status(400).json({ error: 'Thiếu giờ bắt đầu' });
  if (start && end && end <= start) return res.status(400).json({ error: 'Giờ kết thúc phải sau giờ bắt đầu' });
  const own = await pool.query('SELECT 1 FROM habits WHERE id=$1 AND user_id=$2', [hid, req.user.id]);
  if (!own.rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
  await pool.query(
    `INSERT INTO habit_exceptions (habit_id, user_id, on_date, skipped, start_time, end_time) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (habit_id, on_date) DO UPDATE SET skipped=EXCLUDED.skipped, start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time`,
    [hid, req.user.id, b.date, skipped, start, end]
  );
  res.json({ ok: true });
}));

r.delete('/habit-exceptions', auth, wrap(async (req, res) => {
  const hid = parseInt(req.query.habit_id, 10);
  if (!Number.isInteger(hid) || !isDate(req.query.date)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  await pool.query('DELETE FROM habit_exceptions WHERE habit_id=$1 AND user_id=$2 AND on_date=$3', [hid, req.user.id, req.query.date]);
  res.json({ ok: true });
}));

// ---------- Lịch mẫu ----------
r.use(resource({
  path: '/templates', table: 'templates', order: 'id',
  fields: { name: { t: 'text', req: true, max: 40, label: 'Tên lịch mẫu' }, items: { t: 'json', req: true, max: 60, label: 'Danh sách' } },
}));

module.exports = r;
