import React, { useState } from 'react';
import { api } from '../api.js';
import { AvatarPicker } from './Avatar.jsx';

export default function ProfileSheet({ user, onClose, onSaved }) {
  const [name, setName] = useState(user.display_name || '');
  const [avatar, setAvatar] = useState(user.avatar || null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const body = {};
      if ((name.trim() || null) !== (user.display_name || null)) body.display_name = name.trim() || null;
      if ((avatar || null) !== (user.avatar || null)) body.avatar = avatar;
      if (!Object.keys(body).length) return onClose();
      const updated = await api.updateMe(body);
      onSaved(updated);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="grab" />
        <h3>Chỉnh sửa hồ sơ</h3>
        {err && <div className="err">{err}</div>}
        <AvatarPicker user={{ username: name || user.username }} value={avatar} onChange={setAvatar} onError={setErr} />
        <div className="field">
          <label>Tên hiển thị</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={user.username} maxLength={40} />
        </div>
        <div className="field">
          <label>Tên đăng nhập</label>
          <input className="input" value={user.username} disabled />
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={onClose}>Hủy</button>
        </div>
      </form>
    </div>
  );
}
