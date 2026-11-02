const express = require('express');
const { pool, auth, wrap } = require('../db');

const r = express.Router();

const MAX_DAYS = 14, MAX_ITEMS = 40;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v, lo, hi) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};

/**
 * Kiểm tra và làm sạch chương trình do client gửi lên (client đã đọc file Excel).
 * Trả về { program } hoặc { error }.
 * program = { name, days: [{ title, weekday (0=T2 … 6=CN | null), items: [{ name, sets, reps: [lo, hi], timed, rest, weight, note, url }] }] }
 */
function clean(body) {
  const name = str(body?.name, 60);
  if (!name) return { error: 'Hãy đặt tên cho chương trình' };
  if (!Array.isArray(body.days) || !body.days.length) return { error: 'Chương trình chưa có buổi tập nào' };
  if (body.days.length > MAX_DAYS) return { error: `Tối đa ${MAX_DAYS} buổi tập trong một chương trình` };
  const days = [];
  for (const d of body.days) {
    const title = str(d?.title, 60);
    if (!title) return { error: 'Có buổi tập chưa có tên' };
    const weekday = d.weekday === null || d.weekday === undefined ? null : int(d.weekday, 0, 6);
    if (d.weekday !== null && d.weekday !== undefined && weekday === null) return { error: `Ngày của buổi "${title}" không hợp lệ` };
    if (!Array.isArray(d.items) || !d.items.length) return { error: `Buổi "${title}" chưa có bài tập` };
    if (d.items.length > MAX_ITEMS) return { error: `Buổi "${title}" có quá nhiều bài (tối đa ${MAX_ITEMS})` };
    const items = [];
    for (const it of d.items) {
      const n = str(it?.name, 80);
      if (!n) return { error: `Buổi "${title}" có bài chưa có tên` };
      const sets = int(it.sets, 1, 20);
      if (sets === null) return { error: `Bài "${n}": số hiệp phải từ 1 đến 20` };
      const lo = int(it.reps?.[0], 1, 999), hi = int(it.reps?.[1], 1, 999);
      if (lo === null || hi === null || lo > hi) return { error: `Bài "${n}": reps không hợp lệ` };
      const rest = it.rest === null || it.rest === undefined ? 90 : int(it.rest, 0, 900);
      if (rest === null) return { error: `Bài "${n}": thời gian nghỉ phải từ 0 đến 900 giây` };
      const w = it.weight === null || it.weight === undefined || it.weight === '' ? null : Number(it.weight);
      if (w !== null && (!Number.isFinite(w) || w < 0 || w > 1000)) return { error: `Bài "${n}": mức tạ không hợp lệ` };
      const url = str(it.url, 300);
      if (url && !/^https?:\/\//i.test(url)) return { error: `Bài "${n}": link video phải bắt đầu bằng http hoặc https` };
      items.push({ name: n, sets, reps: [lo, hi], timed: !!it.timed, rest, weight: w, note: str(it.note, 200) || null, url: url || null });
    }
    days.push({ title, weekday, items });
  }
  return { program: { name, days } };
}

r.get('/program', auth, wrap(async (req, res) => {
  const q = await pool.query('SELECT name, data, updated_at FROM user_programs WHERE user_id=$1', [req.user.id]);
  const row = q.rows[0];
  res.json({ program: row ? { name: row.name, days: row.data.days, updated_at: row.updated_at } : null });
}));

r.put('/program', auth, wrap(async (req, res) => {
  const { program, error } = clean(req.body);
  if (error) return res.status(400).json({ error });
  await pool.query(
    `INSERT INTO user_programs (user_id, name, data, updated_at) VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, data = EXCLUDED.data, updated_at = now()`,
    [req.user.id, program.name, JSON.stringify({ days: program.days })]
  );
  res.json(program);
}));

// Quay về chương trình mẫu có sẵn
r.delete('/program', auth, wrap(async (req, res) => {
  await pool.query('DELETE FROM user_programs WHERE user_id=$1', [req.user.id]);
  res.json({ ok: true });
}));

r.clean = clean; // dùng cho kiểm thử
module.exports = r;
