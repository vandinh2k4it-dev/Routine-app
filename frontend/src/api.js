const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

let token = localStorage.getItem('token') || '';
let onUnauthorized = () => {};

// ---------- Cache dữ liệu (hiện ngay lần mở sau, rồi cập nhật bằng dữ liệu mới) ----------
const PREFIX = 'cache:';
const MAX_CACHE_CHARS = 600000;

function purgeCache() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch { /* bỏ qua */ }
}
function buildQs(params) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null);
  return entries.length ? '?' + new URLSearchParams(entries).toString() : '';
}
const cacheKey = (path, params) => PREFIX + path + buildQs(params);
const cacheable = (path) => path === '/api/habits' || path === '/api/logs' || path === '/api/settings';

function peek(path, params) {
  try {
    const raw = localStorage.getItem(cacheKey(path, params));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const setToken = (t) => {
  token = t || '';
  purgeCache(); // đổi tài khoản / đăng xuất thì xóa cache của người trước
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
};
export const getToken = () => token;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function req(path, { method = 'GET', body, params } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}${buildQs(params)}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) onUnauthorized();
  if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
  if (method === 'GET' && cacheable(path)) {
    try {
      const s = JSON.stringify(data);
      if (s.length <= MAX_CACHE_CHARS) localStorage.setItem(cacheKey(path, params), s);
    } catch { /* hết dung lượng: bỏ qua */ }
  }
  return data;
}

export const api = {
  // Tài khoản
  register: (username, password, display_name, avatar) =>
    req('/api/auth/register', { method: 'POST', body: { username, password, display_name, avatar } }),
  login: (username, password) => req('/api/auth/login', { method: 'POST', body: { username, password } }),
  me: () => req('/api/me'),
  updateMe: (body) => req('/api/me', { method: 'PUT', body }),

  // Lịch & thói quen
  habits: () => req('/api/habits'),
  createHabit: (h) => req('/api/habits', { method: 'POST', body: h }),
  bulkHabits: (items) => req('/api/habits/bulk', { method: 'POST', body: { items } }),
  updateHabit: (id, h) => req(`/api/habits/${id}`, { method: 'PUT', body: h }),
  removeHabit: (id) => req(`/api/habits/${id}`, { method: 'DELETE' }),
  logs: (from, to) => req('/api/logs', { params: { from, to } }),
  setDone: (habit_id, date, done) => req('/api/logs', { method: 'PUT', body: { habit_id, date, done } }),
  exceptions: (from, to) => req('/api/habit-exceptions', { params: { from, to } }),
  setException: (b) => req('/api/habit-exceptions', { method: 'PUT', body: b }),
  clearException: (habit_id, date) => req('/api/habit-exceptions', { method: 'DELETE', params: { habit_id, date } }),

  settings: () => req('/api/settings'),
  saveSettings: (b) => req('/api/settings', { method: 'PUT', body: b }),
  bundle: (from, to) => req('/api/bundle', { params: { from, to } }),

  // Truy cập chung cho các module (thể hình, TOEIC, công việc…)
  get: (path, params) => req(path, { params }),
  post: (path, body) => req(path, { method: 'POST', body }),
  put: (path, body) => req(path, { method: 'PUT', body }),
  del: (path, params) => req(path, { method: 'DELETE', params }),
};

/** Đọc dữ liệu đã cache (đồng bộ). Khóa phải khớp đúng tham số của lần gọi api tương ứng. */
export const cached = {
  habits: () => peek('/api/habits'),
  logs: (from, to) => peek('/api/logs', { from, to }),
  settings: () => peek('/api/settings'),
};
