import { isScheduled, logKey, minutesOf, todayISO, toLogSet } from './utils.js';

// Nhắc nhở chạy ngay trong app: kiểm tra mỗi 30 giây khi app đang mở (hoặc nằm nền chưa bị hệ điều hành đóng).
// Muốn nhắc cả khi đã tắt hẳn app thì cần Web Push từ máy chủ (chưa làm).

export const notifSupported = () => typeof Notification !== 'undefined';
export const notifState = () => (notifSupported() ? Notification.permission : 'unsupported');

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function askPermission() {
  if (!notifSupported()) return 'unsupported';
  return Notification.requestPermission();
}

async function show(title, body, tag) {
  const opts = { body, tag, icon: '/icon-192.png', badge: '/favicon-32.png' };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) return await reg.showNotification(title, opts);
    new Notification(title, opts);
  } catch { /* bỏ qua */ }
}

const SENT = 'reminded:';
const wasSent = (k) => localStorage.getItem(SENT + k) === '1';
const markSent = (k) => {
  try {
    localStorage.setItem(SENT + k, '1');
    // dọn các khóa của những ngày trước
    const today = todayISO();
    Object.keys(localStorage).filter((x) => x.startsWith(SENT) && !x.includes(today)).forEach((x) => localStorage.removeItem(x));
  } catch { /* bỏ qua */ }
};

/**
 * Tìm các hoạt động đến giờ nhắc mà chưa xong. Gọi `onDue(habit)` cho từng cái (để hiện toast trong app),
 * đồng thời bắn thông báo hệ thống nếu đã được cấp quyền.
 */
export function checkReminders(habits, logs, onDue) {
  const now = new Date();
  const iso = todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const done = toLogSet(logs);
  for (const h of habits) {
    if (h.remind_before === null || h.remind_before === undefined || !h.start_time) continue;
    if (!isScheduled(h, now) || done.has(logKey(h.id, iso))) continue;
    const start = minutesOf(h.start_time);
    const at = start - h.remind_before;
    // đến giờ nhắc và chưa quá 2 tiếng sau giờ bắt đầu (mở app muộn thì không dồn thông báo cũ)
    if (nowMin < at || nowMin > start + 120) continue;
    const key = `${iso}:${h.id}:${h.start_time}:${h.remind_before}`;
    if (wasSent(key)) continue;
    markSent(key);
    const when = h.remind_before ? `Còn ${h.remind_before} phút nữa, lúc ${h.start_time}` : `Đến giờ rồi, ${h.start_time}`;
    onDue(h, when);
    if (notifState() === 'granted') show(h.title, when, key);
  }
}
