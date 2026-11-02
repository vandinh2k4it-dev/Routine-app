const express = require('express');
const { pool, auth, wrap, isDate, isTime } = require('./db');

// Mô tả cột: { t: 'text'|'int'|'num'|'date'|'time'|'bool'|'enum'|'json', req, max, min, values, owns }
// Kiểm tra một giá trị; trả { v } hoặc { error }
function clean(name, f, raw, label) {
  const empty = raw === undefined || raw === null || raw === '';
  if (empty) {
    if (f.req) return { error: `Thiếu ${label}` };
    return { v: f.def !== undefined ? f.def : null };
  }
  switch (f.t) {
    case 'text': {
      if (typeof raw !== 'string') return { error: `${label} không hợp lệ` };
      const s = raw.trim();
      if (!s && f.req) return { error: `Thiếu ${label}` };
      if (s.length > (f.max || 200)) return { error: `${label} tối đa ${f.max || 200} ký tự` };
      return { v: s || null };
    }
    case 'int':
    case 'num': {
      const n = Number(raw);
      if (!Number.isFinite(n) || (f.t === 'int' && !Number.isInteger(n))) return { error: `${label} không hợp lệ` };
      if (n < (f.min ?? 0) || n > (f.max ?? 1e12)) return { error: `${label} ngoài khoảng cho phép` };
      return { v: n };
    }
    case 'date': return isDate(raw) ? { v: raw } : { error: `${label} không hợp lệ` };
    case 'time': return isTime(raw) ? { v: raw } : { error: `${label} không hợp lệ` };
    case 'bool': return { v: !!raw };
    case 'enum': return f.values.includes(raw) ? { v: raw } : { error: `${label} không hợp lệ` };
    case 'json': {
      if (!Array.isArray(raw) || raw.length > (f.max || 60)) return { error: `${label} không hợp lệ` };
      return { v: JSON.stringify(raw) };
    }
    default: return { error: `${label} không hợp lệ` };
  }
}

function validate(fields, body, partialKeys) {
  const values = {};
  for (const [name, f] of Object.entries(fields)) {
    if (partialKeys && !(name in body)) continue;
    const r = clean(name, f, body[name], f.label || name);
    if (r.error) return { error: r.error };
    if (!partialKeys && r.v === null) continue; // tạo mới: bỏ trống thì để DB dùng giá trị mặc định
    values[name] = r.v;
  }
  return { values };
}

const sel = (name, f) =>
  f.t === 'date' ? `to_char(${name}, 'YYYY-MM-DD') AS ${name}` : f.t === 'num' || f.big ? `${name}::float8 AS ${name}` : name;

/** Ràng buộc: giá trị khóa ngoại phải thuộc về chính người dùng. */
async function checkOwns(fields, values, userId) {
  for (const [name, f] of Object.entries(fields)) {
    if (f.owns && values[name] != null) {
      const r = await pool.query(`SELECT 1 FROM ${f.owns} WHERE id=$1 AND user_id=$2`, [values[name], userId]);
      if (!r.rowCount) return `${f.label || name} không tồn tại`;
    }
  }
  return null;
}

/**
 * CRUD theo người dùng: GET (lọc from/to nếu có dateField) / POST / PUT :id / DELETE :id
 */
function resource({ path, table, fields, dateField, order }) {
  const r = express.Router();
  const cols = ['id', ...Object.entries(fields).map(([n, f]) => sel(n, f))].join(', ');

  r.get(path, auth, wrap(async (req, res) => {
    const params = [req.user.id];
    let sql = `SELECT ${cols} FROM ${table} WHERE user_id=$1`;
    if (dateField && isDate(req.query.from)) { params.push(req.query.from); sql += ` AND ${dateField} >= $${params.length}`; }
    if (dateField && isDate(req.query.to)) { params.push(req.query.to); sql += ` AND ${dateField} <= $${params.length}`; }
    sql += ` ORDER BY ${order || (dateField ? dateField + ' DESC, id DESC' : 'id')} LIMIT 3000`;
    res.json((await pool.query(sql, params)).rows);
  }));

  r.post(path, auth, wrap(async (req, res) => {
    const { values, error } = validate(fields, req.body || {});
    if (error) return res.status(400).json({ error });
    const own = await checkOwns(fields, values, req.user.id);
    if (own) return res.status(400).json({ error: own });
    const names = Object.keys(values);
    const ph = names.map((n, i) => (fields[n].t === 'json' ? `$${i + 2}::jsonb` : `$${i + 2}`));
    const q = await pool.query(
      `INSERT INTO ${table} (user_id, ${names.join(', ')}) VALUES ($1, ${ph.join(', ')}) RETURNING ${cols}`,
      [req.user.id, ...names.map((n) => values[n])]
    );
    res.json(q.rows[0]);
  }));

  r.put(`${path}/:id`, auth, wrap(async (req, res) => {
    const { values, error } = validate(fields, req.body || {}, true);
    if (error) return res.status(400).json({ error });
    const names = Object.keys(values);
    if (!names.length) return res.status(400).json({ error: 'Không có gì để cập nhật' });
    const own = await checkOwns(fields, values, req.user.id);
    if (own) return res.status(400).json({ error: own });
    const sets = names.map((n, i) => `${n} = $${i + 1}${fields[n].t === 'json' ? '::jsonb' : ''}`);
    const q = await pool.query(
      `UPDATE ${table} SET ${sets.join(', ')} WHERE id=$${names.length + 1} AND user_id=$${names.length + 2} RETURNING ${cols}`,
      [...names.map((n) => values[n]), req.params.id, req.user.id]
    );
    if (!q.rows[0]) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(q.rows[0]);
  }));

  r.delete(`${path}/:id`, auth, wrap(async (req, res) => {
    await pool.query(`DELETE FROM ${table} WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  }));
  return r;
}

/**
 * Bảng mỗi ngày một dòng (khóa user_id + ngày): GET range / PUT upsert (chỉ cập nhật cột có gửi lên) / DELETE ?date
 */
function daily({ path, table, dateField, fields }) {
  const r = express.Router();
  const cols = [`${sel(dateField, { t: 'date' })}`, ...Object.entries(fields).map(([n, f]) => sel(n, f))].join(', ');

  r.get(path, auth, wrap(async (req, res) => {
    const { from, to } = req.query;
    if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: 'Thiếu from/to' });
    const q = await pool.query(
      `SELECT ${cols} FROM ${table} WHERE user_id=$1 AND ${dateField} BETWEEN $2 AND $3 ORDER BY ${dateField}`,
      [req.user.id, from, to]
    );
    res.json(q.rows);
  }));

  r.put(path, auth, wrap(async (req, res) => {
    const body = req.body || {};
    if (!isDate(body[dateField])) return res.status(400).json({ error: 'Ngày không hợp lệ' });
    const { values, error } = validate(fields, body, true);
    if (error) return res.status(400).json({ error });
    const names = Object.keys(values);
    if (!names.length) return res.status(400).json({ error: 'Không có gì để lưu' });
    const q = await pool.query(
      `INSERT INTO ${table} (user_id, ${dateField}, ${names.join(', ')})
       VALUES ($1, $2, ${names.map((_, i) => `$${i + 3}`).join(', ')})
       ON CONFLICT (user_id, ${dateField}) DO UPDATE SET ${names.map((n) => `${n} = EXCLUDED.${n}`).join(', ')}
       RETURNING ${cols}`,
      [req.user.id, body[dateField], ...names.map((n) => values[n])]
    );
    res.json(q.rows[0]);
  }));

  r.delete(path, auth, wrap(async (req, res) => {
    if (!isDate(req.query.date)) return res.status(400).json({ error: 'Ngày không hợp lệ' });
    await pool.query(`DELETE FROM ${table} WHERE user_id=$1 AND ${dateField}=$2`, [req.user.id, req.query.date]);
    res.json({ ok: true });
  }));
  return r;
}

module.exports = { resource, daily };
