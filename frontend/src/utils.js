export const CATEGORIES = [
  { id: 'work', label: 'Làm việc', icon: '💼', color: '#3fa9f5' },
  { id: 'study', label: 'Học tập', icon: '📚', color: '#8b7bff' },
  { id: 'gym', label: 'Tập gym', icon: '🏋️', color: '#ff8a4c' },
  { id: 'health', label: 'Sức khỏe', icon: '🧘', color: '#22c3a6' },
  { id: 'meal', label: 'Ăn uống', icon: '🍱', color: '#f2c94c' },
  { id: 'home', label: 'Việc nhà', icon: '🧹', color: '#ff5c8a' },
  { id: 'relax', label: 'Thư giãn', icon: '🎧', color: '#6bd1ff' },
  { id: 'other', label: 'Khác', icon: '✨', color: '#9aa3b2' },
];
export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

// Chọn nhanh khi tạo hoạt động mới
export const PRESETS = [
  { title: 'Tập gym', category: 'gym', start: '18:00', end: '19:30' },
  { title: 'Học bài', category: 'study', start: '20:00', end: '21:30' },
  { title: 'Làm việc', category: 'work', start: '08:30', end: '17:30' },
  { title: 'Uống nước', category: 'health', start: '', end: '' },
];

const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayISO = () => toISO(new Date());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfWeek = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };

// Thứ hai = 0 … Chủ nhật = 6 (bit tương ứng trong `days`)
export const WD_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WD_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
export const wdIndex = (d) => (d.getDay() + 6) % 7;
export const ALL_DAYS = 127;
export const isScheduled = (habit, d) => (habit.days & (1 << wdIndex(d))) !== 0 && habit.start_date <= toISO(d);

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

export const timeLabel = (h) => (h.start_time ? (h.end_time ? `${h.start_time} – ${h.end_time}` : h.start_time) : 'Cả ngày');
export const minutesOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export const REMIND_OPTIONS = [
  { v: '', label: 'Không nhắc' },
  { v: 0, label: 'Đúng giờ' },
  { v: 5, label: 'Trước 5 phút' },
  { v: 15, label: 'Trước 15 phút' },
  { v: 30, label: 'Trước 30 phút' },
  { v: 60, label: 'Trước 1 giờ' },
];
export const remindLabel = (m) => REMIND_OPTIONS.find((o) => o.v === m)?.label || `Trước ${m} phút`;

/** Hoạt động xếp theo giờ, việc không có giờ xuống cuối. */
export const byTime = (a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99') || a.id - b.id;

/** logs: Set các khóa `${habit_id}|${date}` */
export const logKey = (id, iso) => `${id}|${iso}`;
export const toLogSet = (logs) => new Set((logs || []).map((l) => logKey(l.habit_id, l.done_on)));

/** Chuỗi ngày liên tiếp hoàn thành một hoạt động, tính ngược từ hôm nay (hôm nay chưa xong thì chưa bị mất chuỗi). */
export function habitStreak(habit, logSet, today = new Date()) {
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, -i);
    if (toISO(d) < habit.start_date) break;
    if (!isScheduled(habit, d)) continue;
    if (logSet.has(logKey(habit.id, toISO(d)))) streak++;
    else if (i > 0) break;
  }
  return streak;
}

/** Chuỗi ngày hoàn thành TẤT CẢ việc đã lên lịch (ngày không có việc thì bỏ qua). */
export function dayStreak(habits, logSet, today = new Date()) {
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, -i);
    const due = habits.filter((h) => isScheduled(h, d));
    if (!due.length) {
      if (toISO(d) < (habits.map((h) => h.start_date).sort()[0] || '9999')) break;
      continue;
    }
    if (due.every((h) => logSet.has(logKey(h.id, toISO(d))))) streak++;
    else if (i > 0) break;
  }
  return streak;
}

/** Thống kê một khoảng ngày [from, to] (tới hôm nay là cùng). */
export function rangeStats(habits, logSet, from, to) {
  let due = 0, done = 0;
  const perDay = [];
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
    const iso = toISO(d);
    const list = habits.filter((h) => isScheduled(h, d));
    const ok = list.filter((h) => logSet.has(logKey(h.id, iso))).length;
    due += list.length; done += ok;
    perDay.push({ iso, due: list.length, done: ok });
  }
  return { due, done, rate: due ? Math.round((done / due) * 100) : 0, perDay };
}
