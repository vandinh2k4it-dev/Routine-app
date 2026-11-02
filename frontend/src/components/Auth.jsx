import React, { useState } from 'react';
import { api, setToken } from '../api.js';
import { AvatarPicker } from './Avatar.jsx';

export default function Auth({ onDone }) {
  const [mode, setMode] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const isReg = mode === 'register';

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { token, user } = isReg
        ? await api.register(username, password, displayName.trim() || null, avatar)
        : await api.login(username, password);
      setToken(token);
      localStorage.setItem('user', JSON.stringify(user));
      onDone(user);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth" onSubmit={submit}>
      <img className="logo" src="/icon-192.png" alt="Lịch Thói Quen" />
      <h1>Lịch Thói Quen</h1>
      <p>{isReg ? 'Tạo tài khoản để lên lịch mỗi ngày' : 'Đăng nhập để xem lịch trình của bạn'}</p>
      <div className="card pad">
        {err && <div className="err">{err}</div>}

        {isReg && (
          <>
            <AvatarPicker user={{ username: displayName || username || '?' }} value={avatar} onChange={setAvatar} onError={setErr} />
            <div className="field">
              <label>Tên hiển thị</label>
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="VD: Văn Đình" maxLength={40} autoComplete="name" />
            </div>
          </>
        )}

        <div className="field">
          <label>Tên đăng nhập</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="username" required />
        </div>
        <div className="field">
          <label>Mật khẩu</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isReg ? 'new-password' : 'current-password'} required />
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Đang xử lý…' : isReg ? 'Đăng ký' : 'Đăng nhập'}</button>
      </div>
      <button type="button" className="link" onClick={() => { setMode(isReg ? 'login' : 'register'); setErr(''); }}>
        {isReg ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
      </button>
    </form>
  );
}
