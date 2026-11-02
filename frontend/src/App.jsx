import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getToken, setToken, setUnauthorizedHandler, api, cached } from './api.js';
import Auth from './components/Auth.jsx';
import Today from './components/Today.jsx';
import Habits from './components/Habits.jsx';
import Stats from './components/Stats.jsx';
import HabitSheet from './components/HabitSheet.jsx';
import ProfileSheet from './components/ProfileSheet.jsx';
import { Avatar, userName } from './components/Avatar.jsx';
import { addDays, toISO } from './utils.js';
import { askPermission, checkReminders, notifState, registerSW } from './reminders.js';

const HISTORY_DAYS = 120;
const logRange = () => {
  const now = new Date();
  return [toISO(addDays(now, -HISTORY_DAYS)), toISO(now)];
};

function loadUser() {
  try { return getToken() ? JSON.parse(localStorage.getItem('user')) : null; } catch { return null; }
}

export default function App() {
  const [user, setUser] = useState(loadUser);
  const [tab, setTab] = useState('home');
  const [sheet, setSheet] = useState(null); // null | {} (mới) | habit (sửa)
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [notif, setNotif] = useState(notifState());
  // Hiện ngay dữ liệu lần trước (nếu có), rồi cập nhật khi server trả lời
  const [habits, setHabits] = useState(() => cached.habits());
  const [logs, setLogs] = useState(() => cached.logs(...logRange()));
  const [err, setErr] = useState('');
  const toastTimer = useRef();

  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const logout = useCallback(() => {
    setToken('');
    localStorage.removeItem('user');
    setUser(null);
    setHabits(null);
    setLogs(null);
  }, []);

  const storeUser = useCallback((u) => {
    try { localStorage.setItem('user', JSON.stringify(u)); } catch { /* ảnh quá lớn cho localStorage: bỏ qua */ }
    setUser(u);
  }, []);

  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);
  useEffect(() => { registerSW(); }, []);

  const reload = useCallback(() => {
    setErr('');
    const [from, to] = logRange();
    return Promise.all([api.habits(), api.logs(from, to)])
      .then(([h, l]) => { setHabits(h); setLogs(l); })
      .catch((e) => setErr(e.message));
  }, []);

  const hasUser = !!user;
  useEffect(() => {
    if (!hasUser) return;
    api.me().then(storeUser).catch(() => {});
    reload();
  }, [hasUser, storeUser, reload]);

  // Mở lại app từ nền thì tải lại (qua ngày mới, hoặc sửa từ máy khác)
  useEffect(() => {
    if (!hasUser) return;
    const h = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [hasUser, reload]);

  // Nhắc nhở: kiểm tra mỗi 30 giây khi app đang mở
  const live = useRef({});
  live.current = { habits, logs };
  useEffect(() => {
    if (!hasUser) return;
    const tick = () => {
      const { habits: hs, logs: ls } = live.current;
      if (hs && ls) checkReminders(hs, ls, (h, when) => flash(`🔔 ${h.title} · ${when}`));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [hasUser, flash]);

  async function onToggle(habitId, date, done) {
    const prev = logs;
    setLogs((cur) => {
      const rest = (cur || []).filter((l) => !(l.habit_id === habitId && l.done_on === date));
      return done ? [...rest, { habit_id: habitId, done_on: date }] : rest;
    });
    try {
      await api.setDone(habitId, date, done);
    } catch (e) {
      setLogs(prev);
      flash(e.message);
    }
  }

  const saved = (msg) => {
    setSheet(null);
    flash(msg);
    reload();
  };

  async function enableNotif() {
    const r = await askPermission();
    setNotif(r);
    if (r === 'granted') flash('Đã bật thông báo');
    else if (r === 'denied') flash('Thông báo bị chặn, hãy bật lại trong cài đặt trình duyệt');
  }

  if (!user) return <Auth onDone={setUser} />;

  const loaded = habits !== null && logs !== null;
  const list = habits || [];
  const tabs = [
    { id: 'home', icon: '🗓️', label: 'Hôm nay' },
    { id: 'habits', icon: '📋', label: 'Hoạt động' },
    { id: 'add' },
    { id: 'stats', icon: '📊', label: 'Thống kê' },
    { id: 'me', icon: '👤', label: 'Tôi' },
  ];

  return (
    <div className="app">
      {err && tab !== 'me' && <div className="page" style={{ paddingBottom: 0 }}><div className="err" style={{ margin: 0 }}>{err}</div></div>}
      {tab === 'home' && (
        <Today user={user} habits={list} logs={logs || []} loaded={loaded} onToggle={onToggle}
          onEdit={setSheet} onAdd={() => setSheet({})} onProfile={() => setTab('me')} />
      )}
      {tab === 'habits' && <Habits habits={list} loaded={loaded} onEdit={setSheet} onAdd={() => setSheet({})} />}
      {tab === 'stats' && <Stats habits={list} logs={logs || []} loaded={loaded} />}
      {tab === 'me' && (
        <div className="page">
          <div className="topbar"><h1 className="title">Tài khoản</h1></div>
          <div className="card pad profile-card">
            <Avatar user={user} size={84} />
            <b className="pname">{userName(user)}</b>
            <div className="hello muted">@{user.username}</div>
            <button className="btn" style={{ marginTop: 16 }} onClick={() => setProfileOpen(true)}>Chỉnh sửa hồ sơ</button>
          </div>

          <div className="card pad" style={{ marginTop: 14 }}>
            <b>🔔 Thông báo nhắc nhở</b>
            {notif === 'unsupported' && <p className="hint">Trình duyệt này không hỗ trợ thông báo. Trên iPhone hãy thêm app vào Màn hình chính (iOS 16.4 trở lên) rồi mở lại từ biểu tượng.</p>}
            {notif === 'granted' && <p className="hint">Đã bật. Nhắc nhở hiện khi app đang mở hoặc đang chạy nền. Nếu tắt hẳn app thì sẽ không nhắc được.</p>}
            {notif === 'denied' && <p className="hint">Thông báo đang bị chặn. Hãy bật lại trong cài đặt của trình duyệt hoặc iPhone.</p>}
            {notif === 'default' && (
              <>
                <p className="hint">Cho phép để nhận nhắc nhở trước giờ mỗi hoạt động.</p>
                <button className="btn" onClick={enableNotif}>Bật thông báo</button>
              </>
            )}
          </div>

          <button className="btn danger" style={{ marginTop: 14 }} onClick={logout}>Đăng xuất</button>
        </div>
      )}

      <nav className="tabbar">
        {tabs.map((t) =>
          t.id === 'add' ? (
            <button key="add" className="fab" aria-label="Thêm hoạt động" onClick={() => setSheet({})}>+</button>
          ) : (
            <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>
              <span className="i">{t.icon}</span>
              {t.label}
            </button>
          )
        )}
      </nav>

      {sheet && <HabitSheet initial={sheet} onClose={() => setSheet(null)} onSaved={saved} />}
      {profileOpen && (
        <ProfileSheet
          user={user}
          onClose={() => setProfileOpen(false)}
          onSaved={(u) => { storeUser(u); setProfileOpen(false); flash('Đã lưu hồ sơ'); }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
