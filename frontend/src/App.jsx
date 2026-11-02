import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getToken, setToken, setUnauthorizedHandler, api, cached } from './api.js';
import { getTheme, setTheme } from './hooks.js';
import Auth from './components/Auth.jsx';
import Dashboard from './components/Dashboard.jsx';
import Schedule from './components/Schedule.jsx';
import Habits from './components/Habits.jsx';
import Fitness from './components/Fitness.jsx';
import Toeic from './components/Toeic.jsx';
import Work from './components/Work.jsx';
import Review from './components/Review.jsx';
import HabitSheet from './components/HabitSheet.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import ProfileSheet from './components/ProfileSheet.jsx';
import { Seg } from './components/ui.jsx';
import { Avatar, userName } from './components/Avatar.jsx';
import { addDays, toExMap, toISO, toLogSet, withDefaults } from './utils.js';
import { askPermission, checkReminders, notifState, registerSW } from './reminders.js';

const HISTORY_DAYS = 120;
const logRange = () => {
  const now = new Date();
  return [toISO(addDays(now, -HISTORY_DAYS)), toISO(now)];
};

function loadUser() {
  try { return getToken() ? JSON.parse(localStorage.getItem('user')) : null; } catch { return null; }
}

// Mục điều hướng. Trên điện thoại, nhóm "grow" gom các màn phát triển bản thân vào một thẻ.
const GROW = [
  { id: 'habits', icon: '✅', label: 'Thói quen', desc: 'Checklist, chuỗi ngày, lịch sử' },
  { id: 'fitness', icon: '🏋️', label: 'Thể hình', desc: 'Buổi tập, số đo, dinh dưỡng' },
  { id: 'toeic', icon: '🎧', label: 'TOEIC', desc: 'Bấm giờ, từ vựng, mock test' },
  { id: 'work', icon: '💼', label: 'Công việc', desc: 'Dự án, task, thu nhập' },
  { id: 'review', icon: '📈', label: 'Tổng kết tuần', desc: 'Số liệu và mục tiêu tuần tới' },
];
const SIDE = [
  { id: 'home', icon: '🏠', label: 'Tổng quan' },
  { id: 'schedule', icon: '🗓️', label: 'Lịch' },
  ...GROW,
  { id: 'me', icon: '👤', label: 'Tôi' },
];

export default function App() {
  const [user, setUser] = useState(loadUser);
  const [tab, setTab] = useState('home');
  const [sheet, setSheet] = useState(null); // { initial, ctx, defaultKind }
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [notif, setNotif] = useState(notifState());
  const [theme, setThemeState] = useState(getTheme());
  // Hiện ngay dữ liệu lần trước (nếu có), rồi cập nhật khi server trả lời
  const [habits, setHabits] = useState(() => cached.habits());
  const [logs, setLogs] = useState(() => cached.logs(...logRange()));
  const [exceptions, setExceptions] = useState(null);
  const [settings, setSettings] = useState(() => cached.settings());
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
    setUser(null); setHabits(null); setLogs(null); setExceptions(null); setSettings(null);
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
    const exTo = toISO(addDays(new Date(), 60));
    return Promise.all([api.habits(), api.logs(from, to), api.exceptions(from, exTo), api.settings()])
      .then(([h, l, e, s]) => { setHabits(h); setLogs(l); setExceptions(e); setSettings(s); })
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

  const D = useMemo(() => ({
    habits: habits || [],
    logs: logs || [],
    logSet: toLogSet(logs),
    exMap: toExMap(exceptions),
    settings,
    loaded: habits !== null && logs !== null,
  }), [habits, logs, exceptions, settings]);

  // Nhắc nhở: kiểm tra mỗi 30 giây khi app đang mở
  const live = useRef(D);
  live.current = D;
  useEffect(() => {
    if (!hasUser) return;
    const tick = () => {
      const d = live.current;
      if (d.loaded) checkReminders(d.habits, d.exMap, d.logs, (h, when) => flash(`🔔 ${h.title} · ${when}`));
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

  const go = (id) => { setTab(id); window.scrollTo(0, 0); };
  const onEdit = (h, ctx) => setSheet({ initial: h, ctx });
  const onAdd = (ctx) => setSheet({ initial: {}, ctx, defaultKind: tab === 'habits' ? 'habit' : 'block' });
  const saved = (msg) => { setSheet(null); flash(msg); reload(); };

  async function enableNotif() {
    const r = await askPermission();
    setNotif(r);
    if (r === 'granted') flash('Đã bật thông báo');
    else if (r === 'denied') flash('Thông báo bị chặn, hãy bật lại trong cài đặt trình duyệt');
  }

  if (!user) return <Auth onDone={setUser} />;

  const inGrow = ['grow', ...GROW.map((g) => g.id)].includes(tab);
  const back = () => go('grow');
  const goal = withDefaults(settings);

  const bottom = [
    { id: 'home', icon: '🏠', label: 'Tổng quan', on: tab === 'home' },
    { id: 'schedule', icon: '🗓️', label: 'Lịch', on: tab === 'schedule' },
    { id: 'add' },
    { id: 'grow', icon: '🚀', label: 'Phát triển', on: inGrow },
    { id: 'me', icon: '👤', label: 'Tôi', on: tab === 'me' },
  ];

  return (
    <div className="app">
      {err && tab !== 'me' && <div className="page" style={{ paddingBottom: 0 }}><div className="err" style={{ margin: 0 }}>{err}</div></div>}

      {tab === 'home' && <Dashboard D={D} user={user} onToggle={onToggle} onEdit={onEdit} go={go} onProfile={() => go('me')} />}
      {tab === 'schedule' && <Schedule D={D} onToggle={onToggle} onEdit={onEdit} onAdd={onAdd} reload={reload} flash={flash} />}
      {tab === 'habits' && <Habits D={D} onToggle={onToggle} onEdit={onEdit} onAdd={onAdd} onBack={back} />}
      {tab === 'fitness' && <Fitness D={D} onBack={back} onSettings={() => setSettingsOpen(true)} />}
      {tab === 'toeic' && <Toeic D={D} onBack={back} onSettings={() => setSettingsOpen(true)} />}
      {tab === 'work' && <Work onBack={back} />}
      {tab === 'review' && <Review D={D} onBack={back} />}
      {tab === 'grow' && (
        <div className="page">
          <div className="topbar"><h1 className="title">Phát triển bản thân</h1></div>
          <div className="growgrid">
            {GROW.map((g) => (
              <button key={g.id} className="growcard" onClick={() => go(g.id)}>
                <span className="gi">{g.icon}</span>
                <b>{g.label}</b>
                <small>{g.desc}</small>
              </button>
            ))}
          </div>
        </div>
      )}
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
            <b>🎨 Giao diện</b>
            <div style={{ marginTop: 10 }}>
              <Seg value={theme} onChange={(t) => { setTheme(t); setThemeState(t); }} options={[['auto', 'Tự động'], ['light', 'Sáng'], ['dark', 'Tối']]} />
            </div>
            <b>🎯 Mục tiêu</b>
            <p className="hint">Giờ ngủ {goal.bed}, dậy {goal.wake} · TOEIC {goal.toeic_target} điểm · {goal.calories} kcal, {goal.protein}g protein</p>
            <button className="btn ghost" onClick={() => setSettingsOpen(true)}>Chỉnh mục tiêu & lịch tập</button>
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

      {/* Điện thoại: thanh dưới */}
      <nav className="tabbar">
        {bottom.map((t) =>
          t.id === 'add' ? (
            <button key="add" className="fab" aria-label="Thêm" onClick={() => onAdd(null)}>+</button>
          ) : (
            <button key={t.id} className={'tab' + (t.on ? ' on' : '')} onClick={() => go(t.id)}>
              <span className="i">{t.icon}</span>
              {t.label}
            </button>
          )
        )}
      </nav>

      {/* Máy tính: thanh bên */}
      <aside className="sidebar">
        <div className="brand">Life OS</div>
        <button className="side-add" onClick={() => onAdd(null)}>+ Thêm vào lịch</button>
        {SIDE.map((t) => (
          <button key={t.id} className={'side-item' + (tab === t.id ? ' on' : '')} onClick={() => go(t.id)}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </aside>

      {sheet && <HabitSheet initial={sheet.initial} ctx={sheet.ctx} defaultKind={sheet.defaultKind} onClose={() => setSheet(null)} onSaved={saved} />}
      {settingsOpen && <SettingsSheet settings={settings} onClose={() => setSettingsOpen(false)} onSaved={(s) => { setSettings(s); setSettingsOpen(false); flash('Đã lưu mục tiêu'); }} />}
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
