export const CATEGORIES = [
  { id: 'work', label: 'Freelancer', icon: '💼', color: '#3fa9f5' },
  { id: 'dev', label: 'Backend / AI', icon: '💻', color: '#6d4aff' },
  { id: 'toeic', label: 'TOEIC', icon: '🎧', color: '#8b7bff' },
  { id: 'study', label: 'Học tập', icon: '📚', color: '#b07bff' },
  { id: 'gym', label: 'Gym', icon: '🏋️', color: '#ff8a4c' },
  { id: 'sport', label: 'Thể thao', icon: '⚽', color: '#22c3a6' },
  { id: 'health', label: 'Sức khỏe', icon: '🧘', color: '#37d6a8' },
  { id: 'meal', label: 'Ăn uống', icon: '🍱', color: '#f2c94c' },
  { id: 'rest', label: 'Nghỉ ngơi', icon: '😌', color: '#6bd1ff' },
  { id: 'fun', label: 'Giải trí', icon: '🎮', color: '#ff5c8a' },
  { id: 'relax', label: 'Thư giãn', icon: '🌙', color: '#9aa3ff' },
  { id: 'sleep', label: 'Ngủ', icon: '😴', color: '#7a86c9' },
  { id: 'home', label: 'Việc nhà', icon: '🧹', color: '#ff9fb0' },
  { id: 'other', label: 'Khác', icon: '✨', color: '#9aa3b2' },
];
export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

// ---------- Mẫu có sẵn ----------
export const PRESETS = [
  { title: 'Gym', category: 'gym', start: '15:30', end: '17:00' },
  { title: 'TOEIC', category: 'toeic', start: '19:00', end: '20:00' },
  { title: 'Backend / AI', category: 'dev', start: '13:00', end: '14:30' },
  { title: 'Freelancer', category: 'work', start: '08:30', end: '10:30' },
];
export const HABIT_PRESETS = [
  'Thức dậy đúng giờ', 'Ngủ đúng giờ', 'Gym', 'TOEIC', 'Học Backend / AI', 'Uống đủ nước',
  'Ăn đủ protein', 'Đi bộ', 'Skincare', 'Đọc sách', 'Hạn chế điện thoại',
];

const blk = (start, end, title, category, extra = {}) => ({ kind: 'block', title, category, start_time: start, end_time: end, days: 127, ...extra });
/** Lịch sinh hoạt mẫu (có thể sửa sau). Gym T2–T6, đá banh thứ Bảy. */
export const SAMPLE_ROUTINE = [
  blk('07:30', '08:00', 'Thức dậy, uống nước, vệ sinh cá nhân', 'health', { remind_before: 0 }),
  blk('08:00', '08:30', 'Ăn sáng', 'meal'),
  blk('08:30', '10:30', 'Freelancer / công việc quan trọng', 'work', { remind_before: 5 }),
  blk('10:30', '11:00', 'Nghỉ ngơi', 'rest'),
  blk('11:00', '12:00', 'TOEIC: từ vựng, ngữ pháp', 'toeic', { remind_before: 10 }),
  blk('12:00', '13:00', 'Ăn trưa, nghỉ ngơi', 'meal'),
  blk('13:00', '14:30', 'Backend / AI / freelancer', 'dev', { remind_before: 5 }),
  blk('14:30', '15:00', 'Ăn nhẹ trước tập', 'meal'),
  blk('15:30', '17:00', 'Gym', 'gym', { days: 31, remind_before: 30 }),
  blk('17:00', '18:30', 'Đá banh', 'sport', { days: 32, remind_before: 30 }),
  blk('17:00', '18:00', 'Tắm, nghỉ ngơi, ăn', 'meal', { days: 95 }),
  blk('19:00', '20:00', 'TOEIC: Listening / Reading', 'toeic', { remind_before: 10 }),
  blk('20:00', '21:00', 'Freelancer / project cá nhân', 'work'),
  blk('21:00', '22:30', 'Giải trí, chăm sóc bản thân', 'fun'),
  blk('22:30', '23:30', 'Thư giãn, chuẩn bị ngủ', 'relax', { remind_before: 0 }),
  blk('23:30', null, 'Ngủ', 'sleep', { remind_before: 0 }),
];
export const SAMPLE_HABITS = HABIT_PRESETS.map((title) => ({
  kind: 'habit', title, category: 'health', days: title === 'Gym' ? 31 : 127,
}));

export const TIME_KINDS = [
  { id: 'toeic_vocab', label: 'TOEIC – Từ vựng', group: 'toeic' },
  { id: 'toeic_listening', label: 'TOEIC – Listening', group: 'toeic' },
  { id: 'toeic_reading', label: 'TOEIC – Reading', group: 'toeic' },
  { id: 'toeic', label: 'TOEIC – Khác', group: 'toeic' },
  { id: 'backend', label: 'Backend', group: 'dev' },
  { id: 'ai', label: 'AI', group: 'dev' },
  { id: 'freelance', label: 'Freelancer', group: 'work' },
  { id: 'personal', label: 'Project cá nhân', group: 'work' },
];
export const kindLabel = (id) => TIME_KINDS.find((k) => k.id === id)?.label || id;

// ---------- Ngày giờ ----------
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayISO = () => toISO(new Date());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfWeek = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

// Thứ hai = 0 … Chủ nhật = 6 (bit tương ứng trong `days`)
export const WD_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WD_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
export const wdIndex = (d) => (d.getDay() + 6) % 7;
export const ALL_DAYS = 127;

export function daysLabel(mask) {
  if (mask === ALL_DAYS) return 'Hằng ngày';
  if (mask === 31) return 'Thứ 2 – Thứ 6';
  if (mask === 96) return 'Cuối tuần';
  return WD_SHORT.filter((_, i) => mask & (1 << i)).join(', ');
}

export function dayTitle(iso) {
  const d = fromISO(iso);
  const dm = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  if (iso === todayISO()) return `Hôm nay · ${dm}`;
  if (iso === toISO(addDays(new Date(), -1))) return `Hôm qua · ${dm}`;
  if (iso === toISO(addDays(new Date(), 1))) return `Ngày mai · ${dm}`;
  return `${WD_LONG[d.getDay()]} · ${dm}`;
}
export const longDate = (d) => `${WD_LONG[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
export const weekLabel = (start) => { const e = addDays(start, 6); return `${pad(start.getDate())}/${pad(start.getMonth() + 1)} – ${pad(e.getDate())}/${pad(e.getMonth() + 1)}`; };
export const monthLabel = (d) => `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

export const minutesOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const hhmm = (min) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
export const timeLabel = (h) => (h.start_time ? (h.end_time ? `${h.start_time} – ${h.end_time}` : h.start_time) : 'Cả ngày');
export const fmtHours = (min) => {
  const m = Math.round(min || 0);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}g ${r}p` : `${h} giờ`;
};
export const fmtVND = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + 'đ';
export const num1 = (n) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));

export const REMIND_OPTIONS = [
  { v: '', label: 'Không nhắc' },
  { v: 0, label: 'Đúng giờ' },
  { v: 5, label: 'Trước 5 phút' },
  { v: 10, label: 'Trước 10 phút' },
  { v: 15, label: 'Trước 15 phút' },
  { v: 30, label: 'Trước 30 phút' },
  { v: 60, label: 'Trước 1 giờ' },
];
export const remindLabel = (m) => REMIND_OPTIONS.find((o) => o.v === m)?.label || `Trước ${m} phút`;

/** Xếp theo giờ, việc không có giờ xuống cuối. */
export const byTime = (a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99') || a.id - b.id;

// ---------- Lịch: việc nào diễn ra vào ngày nào ----------
export const logKey = (id, iso) => `${id}|${iso}`;
export const toLogSet = (logs) => new Set((logs || []).map((l) => logKey(l.habit_id, l.done_on)));
export const toExMap = (list) => new Map((list || []).map((e) => [logKey(e.habit_id, e.on_date), e]));

export function isScheduled(h, d) {
  const iso = toISO(d);
  if (h.once_on) return h.once_on === iso;
  return (h.days & (1 << wdIndex(d))) !== 0 && h.start_date <= iso;
}

/** Danh sách việc hiệu lực của một ngày: đã áp dụng "bỏ qua / dời giờ riêng ngày đó". */
export function itemsOn(habits, exMap, d) {
  const iso = toISO(d);
  const out = [];
  for (const h of habits) {
    if (!isScheduled(h, d)) continue;
    const ex = exMap?.get(logKey(h.id, iso));
    if (ex?.skipped) continue;
    if (ex && ex.start_time) out.push({ ...h, start_time: ex.start_time, end_time: ex.end_time, moved: true });
    else out.push(h);
  }
  return out;
}

// ---------- Chuỗi ngày & thống kê ----------
/**
 * Chuỗi ngày liên tiếp hoàn thành một thói quen, tính ngược từ hôm nay.
 * "Mềm": lỡ MỘT ngày không làm mất chuỗi (không cộng thêm), lỡ hai ngày liên tiếp mới đứt.
 */
export function habitStreak(h, logSet, today = new Date()) {
  let streak = 0, misses = 0;
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, -i);
    const iso = toISO(d);
    if (iso < h.start_date) break;
    if (!isScheduled(h, d)) continue;
    if (logSet.has(logKey(h.id, iso))) { streak++; misses = 0; }
    else if (i > 0) { misses++; if (misses >= 2) break; }
  }
  return streak;
}

/** Chuỗi ngày đạt từ `threshold` (mặc định 70%) số việc đã lên lịch; ngày không có việc thì bỏ qua; lỡ một ngày vẫn giữ chuỗi. */
export function dayStreak(habits, exMap, logSet, today = new Date(), threshold = 0.7) {
  const first = habits.map((h) => h.start_date).sort()[0];
  if (!first) return 0;
  let streak = 0, misses = 0;
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, -i);
    if (toISO(d) < first) break;
    const due = itemsOn(habits, exMap, d);
    if (!due.length) continue;
    const done = due.filter((h) => logSet.has(logKey(h.id, toISO(d)))).length;
    if (done / due.length >= threshold) { streak++; misses = 0; }
    else if (i > 0) { misses++; if (misses >= 2) break; }
  }
  return streak;
}

/** Thống kê [from, to]. `filter` lọc loại việc (vd chỉ kind === 'habit'). */
export function rangeStats(habits, exMap, logSet, from, to, filter = () => true) {
  let due = 0, done = 0;
  const perDay = [];
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
    const iso = toISO(d);
    const list = itemsOn(habits, exMap, d).filter(filter);
    const ok = list.filter((h) => logSet.has(logKey(h.id, iso))).length;
    due += list.length; done += ok;
    perDay.push({ iso, due: list.length, done: ok, rate: list.length ? ok / list.length : 0 });
  }
  return { due, done, rate: due ? Math.round((done / due) * 100) : 0, perDay };
}

// ---------- Giấc ngủ ----------
export function sleepHours(s) {
  if (!s?.bedtime || !s?.wake_time) return null;
  let m = minutesOf(s.wake_time) - minutesOf(s.bedtime);
  if (m <= 0) m += 1440;
  return m / 60;
}
/** Ngủ đúng giờ: lệch mục tiêu không quá 30 phút (xét vòng qua nửa đêm). */
export function sleepOnTime(s, goal) {
  if (!s?.bedtime) return false;
  const diff = (a, b) => { const d = Math.abs(minutesOf(a) - minutesOf(b)); return Math.min(d, 1440 - d); };
  return diff(s.bedtime, goal.bed) <= 30 && (!s.wake_time || diff(s.wake_time, goal.wake) <= 45);
}

export const DEFAULT_SETTINGS = {
  bed: '23:30', wake: '07:30', calories: 2500, protein: 130, carbs: 300, fat: 70, water: 2500,
};
export const withDefaults = (s) => ({ ...DEFAULT_SETTINGS, ...(s || {}) });

export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (f(x) || 0), 0);
export const clampPct = (n) => Math.max(0, Math.min(100, Math.round(n)));
