import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getToken, setToken, setUnauthorizedHandler, api, cached } from './api.js';
import { getTheme, setTheme } from './hooks.js';
import Auth from './components/Auth.jsx';
import Today from './components/Today.jsx';
import Fitness from './components/Fitness.jsx';
import Coach from './components/Coach.jsx';
import Onboarding from './components/Onboarding.jsx';
import Plan from './components/Plan.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import ProfileSheet from './components/ProfileSheet.jsx';
import { Seg } from './components/ui.jsx';
import { Avatar, userName } from './components/Avatar.jsx';
import { withDefaults } from './utils.js';
import { askPermission, notifState, registerSW } from './reminders.js';

function loadUser() {
  try { return getToken() ? JSON.parse(localStorage.getItem('user')) : null; } catch { return null; }
}

const TABS = [
  { id: 'home', icon: '🏠', label: 'Hôm nay' },
  { id: 'train', icon: '🏋️', label: 'Tập luyện' },
  { id: 'coach', icon: '🤖', label: 'PT ảo' },
  { id: 'me', icon: '👤', label: 'Tôi' },
];

export default function App() {
  const [user, setUser] = useState(loadUser);
  const [tab, setTab] = useState('home');
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);
  const [redoSurvey, setRedoSurvey] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [notif, setNotif] = useState(notifState());
  const [theme, setThemeState] = useState(getTheme());
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
    setUser(null); setSettings(null); setOnboardingSkipped(false); setRedoSurvey(false); setPlanOpen(false); setTab('home');
  }, []);

  const storeUser = useCallback((u) => {
    try { localStorage.setItem('user', JSON.stringify(u)); } catch { /* ảnh quá lớn cho localStorage: bỏ qua */ }
    setUser(u);
  }, []);

  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);
  useEffect(() => { registerSW(); }, []);

  const reload = useCallback(() => {
    setErr('');
    return api.settings().then(setSettings).catch((e) => setErr(e.message));
  }, []);

  const hasUser = !!user;
  useEffect(() => {
    if (!hasUser) return;
    api.me().then(storeUser).catch(() => {});
    reload();
  }, [hasUser, storeUser, reload]);

  // Mở lại app từ nền thì tải lại
  useEffect(() => {
    if (!hasUser) return;
    const h = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [hasUser, reload]);

  const go = (id) => { setTab(id); window.scrollTo(0, 0); };

  async function enableNotif() {
    const r = await askPermission();
    setNotif(r);
    if (r === 'granted') flash('Đã bật thông báo');
    else if (r === 'denied') flash('Thông báo bị chặn, hãy bật lại trong cài đặt trình duyệt');
  }

  if (!user) return <Auth onDone={setUser} />;

  // Chưa khảo sát thì vào khảo sát trước; "Để sau" chỉ bỏ qua trong phiên này
  const needSurvey = redoSurvey || (settings !== null && !settings.onboarded && !onboardingSkipped);
  if (needSurvey) {
    return (
      <div className="app">
        <Onboarding
          settings={settings}
          onSkip={() => { setOnboardingSkipped(true); setRedoSurvey(false); }}
          onDone={(s) => { setSettings(s); setRedoSurvey(false); setPlanOpen(true); }}
        />
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  if (planOpen) {
    return (
      <div className="app">
        <Plan
          onSkip={() => { setPlanOpen(false); setTab('home'); }}
          onDone={(s) => { setSettings(s); setPlanOpen(false); setTab('train'); flash('Đã lưu lộ trình, vào tập thôi 💪'); }}
        />
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  const goal = withDefaults(settings);

  return (
    <div className="app">
      {err && tab !== 'me' && <div className="page" style={{ paddingBottom: 0 }}><div className="err" style={{ margin: 0 }}>{err}</div></div>}

      {tab === 'home' && <Today user={user} settings={settings} go={go} onProfile={() => go('me')} />}
      {tab === 'train' && <Fitness D={{ settings }} onSettings={() => setSettingsOpen(true)} onPlan={() => setPlanOpen(true)} />}
      {tab === 'coach' && <Coach settings={settings} onSettings={() => setSettingsOpen(true)} />}
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
            <b>🎯 Mục tiêu tập luyện</b>
            <p className="hint">{goal.calories} kcal, {goal.protein}g protein mỗi ngày{settings?.days_per_week ? ` · ${settings.days_per_week} buổi/tuần` : ''}</p>
            <button className="btn ghost" onClick={() => setSettingsOpen(true)}>Chỉnh hồ sơ & dinh dưỡng</button>
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setRedoSurvey(true)}>Làm lại khảo sát</button>
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setPlanOpen(true)}>🤖 Lập lại lộ trình bằng AI</button>
          </div>

          <div className="card pad" style={{ marginTop: 14 }}>
            <b>🎨 Giao diện</b>
            <div style={{ marginTop: 10 }}>
              <Seg value={theme} onChange={(t) => { setTheme(t); setThemeState(t); }} options={[['auto', 'Tự động'], ['light', 'Sáng'], ['dark', 'Tối']]} />
            </div>
          </div>

          <div className="card pad" style={{ marginTop: 14 }}>
            <b>🔔 Thông báo nhắc nhở</b>
            {notif === 'unsupported' && <p className="hint">Trình duyệt này không hỗ trợ thông báo. Trên iPhone hãy thêm app vào Màn hình chính (iOS 16.4 trở lên) rồi mở lại từ biểu tượng.</p>}
            {notif === 'granted' && <p className="hint">Đã cho phép thông báo trên thiết bị này.</p>}
            {notif === 'denied' && <p className="hint">Thông báo đang bị chặn. Hãy bật lại trong cài đặt của trình duyệt hoặc iPhone.</p>}
            {notif === 'default' && (
              <>
                <p className="hint">Cho phép để PT nhắc bạn tập, ăn và uống nước.</p>
                <button className="btn" onClick={enableNotif}>Bật thông báo</button>
              </>
            )}
          </div>

          <button className="btn danger" style={{ marginTop: 14 }} onClick={logout}>Đăng xuất</button>
        </div>
      )}

      {/* Điện thoại: thanh dưới */}
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => go(t.id)}>
            <span className="i">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Máy tính: thanh bên */}
      <aside className="sidebar">
        <div className="brand">PT của tôi</div>
        {TABS.map((t) => (
          <button key={t.id} className={'side-item' + (tab === t.id ? ' on' : '')} onClick={() => go(t.id)}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </aside>

      {settingsOpen && <SettingsSheet settings={settings} onClose={() => setSettingsOpen(false)} onSaved={(s) => { setSettings(s); setSettingsOpen(false); flash('Đã lưu'); }} />}
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
