import React, { useState } from 'react';
import { api } from '../api.js';
import { Sheet } from './ui.jsx';

/** Ghi giấc ngủ của đêm vừa qua, lưu theo ngày thức dậy. */
export default function SleepSheet({ date, initial, goal, onClose, onSaved }) {
  const [bed, setBed] = useState(initial?.bedtime || goal.bed);
  const [wake, setWake] = useState(initial?.wake_time || goal.wake);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { onSaved(await api.put('/api/sleep', { on_date: date, bedtime: bed || null, wake_time: wake || null })); }
    catch (e2) { setErr(e2.message); setBusy(false); }
  }
  return (
    <Sheet title="Giấc ngủ đêm qua" onClose={onClose} onSubmit={save}>
      {err && <div className="err">{err}</div>}
      <div className="field two">
        <div><label>Đi ngủ lúc</label><input className="input" type="time" value={bed} onChange={(e) => setBed(e.target.value)} /></div>
        <div><label>Thức dậy lúc</label><input className="input" type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></div>
      </div>
      <div className="hint" style={{ marginBottom: 12 }}>Mục tiêu của bạn: ngủ {goal.bed}, dậy {goal.wake}. Lệch trong khoảng 30 phút vẫn tính là đúng giờ.</div>
      <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      <div className="btn-row"><button type="button" className="btn ghost" onClick={onClose}>Hủy</button></div>
    </Sheet>
  );
}
