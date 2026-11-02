import React, { useState } from 'react';
import { api } from '../api.js';
import { withDefaults } from '../utils.js';
import { Sheet } from './ui.jsx';

/** Chỉnh hồ sơ, giờ ngủ và mục tiêu dinh dưỡng. Mục tiêu tập và lịch tập thì làm lại khảo sát để PT lên lộ trình mới. */
export default function SettingsSheet({ settings, onClose, onSaved }) {
  const s = withDefaults(settings);
  const [f, setF] = useState({
    bed: s.bed, wake: s.wake,
    calories: s.calories, protein: s.protein, carbs: s.carbs, fat: s.fat, water: s.water, weight_goal: s.weight_goal ?? '',
    sex: s.sex || '', age: s.age ?? '', height: s.height ?? '', goal_note: s.goal_note || '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = { ...f };
      for (const k of ['calories', 'protein', 'carbs', 'fat', 'water', 'weight_goal', 'sex', 'age', 'height', 'goal_note']) if (body[k] === '') body[k] = null;
      onSaved(await api.saveSettings(body));
    } catch (e2) { setErr(e2.message); setBusy(false); }
  }

  const row = (label, k, props = {}) => (
    <div><label>{label}</label><input className="input" value={f[k]} onChange={set(k)} {...props} /></div>
  );
  const nums = { inputMode: 'decimal' };
  return (
    <Sheet title="Hồ sơ & mục tiêu" onClose={onClose} onSubmit={save}>
      {err && <div className="err">{err}</div>}
      <div className="field"><label>Hồ sơ</label></div>
      <div className="field two">
        <div><label>Giới tính</label>
          <select className="input" value={f.sex} onChange={set('sex')}><option value="">Không nói</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select>
        </div>
        {row('Tuổi', 'age', nums)}
      </div>
      <div className="field two">{row('Chiều cao (cm)', 'height', nums)}{row('Cân nặng mục tiêu (kg)', 'weight_goal', nums)}</div>
      <div className="field"><label>Body bạn muốn</label><input className="input" value={f.goal_note} maxLength={300} onChange={set('goal_note')} placeholder="VD: slim fit, vai rộng, bụng rõ" /></div>
      <div className="field"><label>Giấc ngủ</label></div>
      <div className="field two">{row('Giờ ngủ mục tiêu', 'bed', { type: 'time' })}{row('Giờ dậy mục tiêu', 'wake', { type: 'time' })}</div>
      <div className="field"><label>Dinh dưỡng mỗi ngày (hãy chỉnh theo bạn)</label></div>
      <div className="field two">{row('Calories (kcal)', 'calories', nums)}{row('Protein (g)', 'protein', nums)}</div>
      <div className="field two">{row('Carbs (g)', 'carbs', nums)}{row('Fat (g)', 'fat', nums)}</div>
      <div className="field two">{row('Nước (ml)', 'water', nums)}<span /></div>
      <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      <div className="btn-row"><button type="button" className="btn ghost" onClick={onClose}>Hủy</button></div>
    </Sheet>
  );
}
