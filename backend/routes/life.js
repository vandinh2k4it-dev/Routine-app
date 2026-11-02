const express = require('express');
const { pool, auth, wrap, isDate } = require('../db');
const { resource, daily } = require('../crud');

const r = express.Router();

// ---------- Cài đặt cá nhân (mục tiêu, giờ ngủ, kế hoạch gym…) ----------
const SETTINGS_KEYS = {
  bed: 'time', wake: 'time', toeic_target: 'int', toeic_exam: 'date',
  calories: 'int', protein: 'int', carbs: 'int', fat: 'int', water: 'int',
  weight_goal: 'num', gym_plan: 'plan',
  height: 'int', age: 'int', sex: 'sex', goal_note: 'text',
  // Khảo sát ban đầu
  goal: 'goal', experience: 'experience', equipment: 'equipment', days_per_week: 'days', session_min: 'minutes', injuries: 'text', onboarded: 'date', meal_plan: 'longtext',
};
const ENUMS = {
  goal: ['fat_loss', 'muscle_gain', 'recomp', 'fit'],
  experience: ['beginner', 'intermediate', 'advanced'],
  equipment: ['gym', 'home', 'dumbbell'],
};
r.get('/settings', auth, wrap(async (req, res) => {
  const q = await pool.query('SELECT data FROM user_settings WHERE user_id=$1', [req.user.id]);
  res.json(q.rows[0]?.data || {});
}));
r.put('/settings', auth, wrap(async (req, res) => {
  const body = req.body || {};
  const out = {};
  for (const [k, t] of Object.entries(SETTINGS_KEYS)) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null || v === '') { out[k] = null; continue; }
    if (t === 'time' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)) out[k] = v;
    else if (t === 'date' && isDate(v)) out[k] = v;
    else if ((t === 'int' || t === 'num') && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) < 1e6) out[k] = Number(v);
    else if (ENUMS[k] && ENUMS[k].includes(v)) out[k] = v;
    else if (t === 'days' && Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 7) out[k] = Number(v);
    else if (t === 'minutes' && Number.isInteger(Number(v)) && Number(v) >= 15 && Number(v) <= 240) out[k] = Number(v);
    else if (t === 'sex' && ['male', 'female', 'other'].includes(v)) out[k] = v;
    else if (t === 'longtext' && typeof v === 'string' && v.trim().length <= 1500) out[k] = v.trim();
    else if (t === 'text' && typeof v === 'string' && v.trim().length <= 300) out[k] = v.trim();
    else if (t === 'plan' && v && typeof v === 'object' && !Array.isArray(v)) {
      // gym_plan: { '0'..'6': 'tên buổi tập' }
      const plan = {};
      for (let i = 0; i < 7; i++) if (typeof v[i] === 'string' && v[i].trim()) plan[i] = v[i].trim().slice(0, 40);
      out[k] = plan;
    } else return res.status(400).json({ error: `Giá trị "${k}" không hợp lệ` });
  }
  // Gộp vào dữ liệu cũ; khóa có giá trị null thì xóa đi
  const q = await pool.query(
    `INSERT INTO user_settings (user_id, data) VALUES ($1, '{}'::jsonb)
     ON CONFLICT (user_id) DO NOTHING`, [req.user.id]);
  void q;
  const cur = (await pool.query('SELECT data FROM user_settings WHERE user_id=$1', [req.user.id])).rows[0].data || {};
  for (const [k, v] of Object.entries(out)) { if (v === null) delete cur[k]; else cur[k] = v; }
  const saved = await pool.query('UPDATE user_settings SET data=$2::jsonb WHERE user_id=$1 RETURNING data', [req.user.id, JSON.stringify(cur)]);
  res.json(saved.rows[0].data);
}));

// ---------- Buổi tập ----------
const WSELECT = `SELECT w.id, to_char(w.done_on,'YYYY-MM-DD') AS done_on, w.name, w.note,
  COALESCE(json_agg(json_build_object('exercise', s.exercise, 'set_no', s.set_no, 'reps', s.reps, 'weight', s.weight::float8)
    ORDER BY s.id) FILTER (WHERE s.id IS NOT NULL), '[]') AS sets
  FROM workouts w LEFT JOIN workout_sets s ON s.workout_id = w.id`;

function readWorkout(b) {
  b = b || {};
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 60) : '';
  if (!name) return { error: 'Nhập tên buổi tập' };
  if (!isDate(b.done_on)) return { error: 'Ngày không hợp lệ' };
  const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 300) : null;
  const sets = [];
  for (const s of Array.isArray(b.sets) ? b.sets.slice(0, 150) : []) {
    const exercise = typeof s?.exercise === 'string' ? s.exercise.trim().slice(0, 60) : '';
    const reps = Math.round(Number(s?.reps));
    const weight = Number(s?.weight) || 0;
    if (!exercise) continue;
    if (!Number.isFinite(reps) || reps < 0 || reps > 1000 || weight < 0 || weight > 2000) return { error: 'Số hiệp/tạ không hợp lệ' };
    sets.push({ exercise, reps, weight });
  }
  return { w: { name, done_on: b.done_on, note, sets } };
}

async function saveSets(c, workoutId, sets) {
  await c.query('DELETE FROM workout_sets WHERE workout_id=$1', [workoutId]);
  const count = {};
  for (const s of sets) {
    count[s.exercise] = (count[s.exercise] || 0) + 1;
    await c.query('INSERT INTO workout_sets (workout_id, exercise, set_no, reps, weight) VALUES ($1,$2,$3,$4,$5)',
      [workoutId, s.exercise, count[s.exercise], s.reps, s.weight]);
  }
}

async function withTx(fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

r.get('/workouts', auth, wrap(async (req, res) => {
  const { from, to } = req.query;
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: 'Thiếu from/to' });
  const q = await pool.query(
    `${WSELECT} WHERE w.user_id=$1 AND w.done_on BETWEEN $2 AND $3 GROUP BY w.id ORDER BY w.done_on DESC, w.id DESC`,
    [req.user.id, from, to]
  );
  res.json(q.rows);
}));

r.post('/workouts', auth, wrap(async (req, res) => {
  const { w, error } = readWorkout(req.body);
  if (error) return res.status(400).json({ error });
  const id = await withTx(async (c) => {
    const ins = await c.query('INSERT INTO workouts (user_id, done_on, name, note) VALUES ($1,$2,$3,$4) RETURNING id', [req.user.id, w.done_on, w.name, w.note]);
    await saveSets(c, ins.rows[0].id, w.sets);
    return ins.rows[0].id;
  });
  res.json((await pool.query(`${WSELECT} WHERE w.id=$1 GROUP BY w.id`, [id])).rows[0]);
}));

r.put('/workouts/:id', auth, wrap(async (req, res) => {
  const { w, error } = readWorkout(req.body);
  if (error) return res.status(400).json({ error });
  const id = await withTx(async (c) => {
    const up = await c.query('UPDATE workouts SET done_on=$1, name=$2, note=$3 WHERE id=$4 AND user_id=$5 RETURNING id',
      [w.done_on, w.name, w.note, req.params.id, req.user.id]);
    if (!up.rows[0]) return null;
    await saveSets(c, up.rows[0].id, w.sets);
    return up.rows[0].id;
  });
  if (!id) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json((await pool.query(`${WSELECT} WHERE w.id=$1 GROUP BY w.id`, [id])).rows[0]);
}));

r.delete('/workouts/:id', auth, wrap(async (req, res) => {
  await pool.query('DELETE FROM workouts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

// ---------- Số đo, dinh dưỡng, giấc ngủ (mỗi ngày một dòng) ----------
const num = (label, max) => ({ t: 'num', min: 0, max, label });
r.use(daily({
  path: '/body', table: 'body_metrics', dateField: 'on_date',
  fields: { weight: num('Cân nặng', 400), body_fat: num('Body fat', 80), muscle_mass: num('Khối lượng cơ', 200), fat_mass: num('Khối lượng mỡ', 300), bmi: num('BMI', 100), visceral_fat: num('Mỡ nội tạng', 60), bmr: num('BMR', 10000), waist: num('Vòng eo', 300), chest: num('Vòng ngực', 300), arm: num('Vòng tay', 100), shoulder: num('Vòng vai', 300) },
}));
r.use(daily({
  path: '/nutrition', table: 'nutrition_logs', dateField: 'on_date',
  fields: { calories: num('Calories', 20000), protein: num('Protein', 1000), carbs: num('Carbs', 2000), fat: num('Fat', 1000), water: num('Nước', 20000) },
}));
r.use(daily({
  path: '/sleep', table: 'sleep_logs', dateField: 'on_date',
  fields: { bedtime: { t: 'time', label: 'Giờ ngủ' }, wake_time: { t: 'time', label: 'Giờ dậy' } },
}));
r.use(daily({
  path: '/week-reviews', table: 'week_reviews', dateField: 'week_start',
  fields: { note: { t: 'text', max: 1000, label: 'Ghi chú' }, next_goals: { t: 'text', max: 1000, label: 'Mục tiêu' } },
}));

// ---------- TOEIC ----------
r.use(resource({
  path: '/vocab', table: 'vocab', order: 'next_review, id',
  fields: {
    word: { t: 'text', req: true, max: 80, label: 'Từ' },
    meaning: { t: 'text', req: true, max: 200, label: 'Nghĩa' },
    example: { t: 'text', max: 300, label: 'Ví dụ' },
    box: { t: 'int', min: 0, max: 6, def: 0, label: 'Hộp' },
    next_review: { t: 'date', def: undefined, label: 'Ngày ôn' },
  },
}));
r.use(resource({
  path: '/mock-tests', table: 'mock_tests', dateField: 'taken_on',
  fields: {
    taken_on: { t: 'date', req: true, label: 'Ngày thi' },
    listening: { t: 'int', req: true, min: 0, max: 495, label: 'Điểm Listening' },
    reading: { t: 'int', req: true, min: 0, max: 495, label: 'Điểm Reading' },
    note: { t: 'text', max: 300, label: 'Ghi chú' },
  },
}));

// ---------- Giờ học / giờ làm, công việc, thu nhập ----------
const TIME_KINDS = ['toeic_vocab', 'toeic_listening', 'toeic_reading', 'toeic', 'backend', 'ai', 'freelance', 'personal'];
r.use(resource({
  path: '/time-logs', table: 'time_logs', dateField: 'logged_on',
  fields: {
    logged_on: { t: 'date', req: true, label: 'Ngày' },
    minutes: { t: 'int', req: true, min: 1, max: 1440, label: 'Số phút' },
    kind: { t: 'enum', req: true, values: TIME_KINDS, label: 'Loại' },
    note: { t: 'text', max: 200, label: 'Ghi chú' },
    project_id: { t: 'int', min: 1, owns: 'projects', label: 'Dự án' },
  },
}));
r.use(resource({
  path: '/projects', table: 'projects', order: 'id',
  fields: {
    name: { t: 'text', req: true, max: 80, label: 'Tên dự án' },
    client: { t: 'text', max: 80, label: 'Khách hàng' },
    kind: { t: 'enum', values: ['freelance', 'personal'], def: 'freelance', label: 'Loại' },
    status: { t: 'enum', values: ['active', 'done'], def: 'active', label: 'Trạng thái' },
    note: { t: 'text', max: 500, label: 'Ghi chú' },
  },
}));
r.use(resource({
  path: '/tasks', table: 'tasks', order: `CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, priority DESC, due_on NULLS LAST, id`,
  fields: {
    title: { t: 'text', req: true, max: 120, label: 'Tên việc' },
    project_id: { t: 'int', min: 1, owns: 'projects', label: 'Dự án' },
    priority: { t: 'int', min: 1, max: 3, def: 2, label: 'Ưu tiên' },
    due_on: { t: 'date', label: 'Hạn' },
    status: { t: 'enum', values: ['todo', 'doing', 'done'], def: 'todo', label: 'Trạng thái' },
    note: { t: 'text', max: 500, label: 'Ghi chú' },
    done_on: { t: 'date', label: 'Ngày xong' },
  },
}));
r.use(resource({
  path: '/income', table: 'income', dateField: 'received_on',
  fields: {
    received_on: { t: 'date', req: true, label: 'Ngày nhận' },
    amount: { t: 'int', big: true, req: true, min: 0, max: 1e12, label: 'Số tiền' },
    project_id: { t: 'int', min: 1, owns: 'projects', label: 'Dự án' },
    note: { t: 'text', max: 200, label: 'Ghi chú' },
  },
}));

// ---------- Gói dữ liệu cho Tổng quan và Tổng kết tuần ----------
r.get('/bundle', auth, wrap(async (req, res) => {
  const { from, to } = req.query;
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: 'Thiếu from/to' });
  const u = req.user.id;
  const p = [u, from, to];
  const [time, workouts, sleep, nutrition, body, tasksOpen, tasksDone, income, vocabDue] = await Promise.all([
    pool.query(`SELECT to_char(logged_on,'YYYY-MM-DD') AS logged_on, minutes, kind FROM time_logs WHERE user_id=$1 AND logged_on BETWEEN $2 AND $3`, p),
    pool.query(`${WSELECT} WHERE w.user_id=$1 AND w.done_on BETWEEN $2 AND $3 GROUP BY w.id ORDER BY w.done_on, w.id`, p),
    pool.query(`SELECT to_char(on_date,'YYYY-MM-DD') AS on_date, bedtime, wake_time FROM sleep_logs WHERE user_id=$1 AND on_date BETWEEN $2 AND $3 ORDER BY on_date`, p),
    pool.query(`SELECT to_char(on_date,'YYYY-MM-DD') AS on_date, calories::float8, protein::float8, carbs::float8, fat::float8, water::float8 FROM nutrition_logs WHERE user_id=$1 AND on_date BETWEEN $2 AND $3 ORDER BY on_date`, p),
    pool.query(`SELECT to_char(on_date,'YYYY-MM-DD') AS on_date, weight::float8 FROM body_metrics WHERE user_id=$1 AND on_date BETWEEN $2 AND $3 AND weight IS NOT NULL ORDER BY on_date`, p),
    pool.query(`SELECT t.id, t.title, t.priority, to_char(t.due_on,'YYYY-MM-DD') AS due_on, t.status, t.project_id, pr.name AS project
                FROM tasks t LEFT JOIN projects pr ON pr.id = t.project_id
                WHERE t.user_id=$1 AND t.status <> 'done' ORDER BY (t.status='doing') DESC, t.due_on NULLS LAST, t.priority DESC LIMIT 100`, [u]),
    pool.query(`SELECT COUNT(*)::int AS n FROM tasks WHERE user_id=$1 AND status='done' AND done_on BETWEEN $2 AND $3`, p),
    pool.query(`SELECT COALESCE(SUM(amount),0)::float8 AS total FROM income WHERE user_id=$1 AND received_on BETWEEN $2 AND $3`, p),
    pool.query(`SELECT COUNT(*)::int AS n FROM vocab WHERE user_id=$1 AND next_review <= $2`, [u, to]),
  ]);
  res.json({
    time_logs: time.rows, workouts: workouts.rows, sleep: sleep.rows, nutrition: nutrition.rows, body: body.rows,
    tasks_open: tasksOpen.rows, tasks_done: tasksDone.rows[0].n, income: income.rows[0].total, vocab_due: vocabDue.rows[0].n,
  });
}));

module.exports = r;
