import React, { useState } from 'react';
import { api } from '../api.js';
import { WD_SHORT, withDefaults } from '../utils.js';
import { Sheet } from './ui.jsx';

/** Mục tiêu và cài đặt cá nhân: giờ ngủ, TOEIC, dinh dưỡng, kế hoạch gym. */
export default function SettingsSheet({ settings, onClose, onSaved }) {
  const s = withDefaults(settings);
  const [f, setF] = useState({
    bed: s.bed, wake: s.wake, toeic_target: s.toeic_target, toeic_exam: s.toeic_exam || '',
    calories: s.calories, protein: s.protein, carbs: s.carbs, fat: s.fat, water: s.water, weight_goal: s.weight_goal ?? '',
    sex: s.sex || '', age: s.age ?? '', height: s.height ?? '', goal_note: s.goal_note || '',
  });
  const [plan, setPlan] = useState(() => Object.fromEntries(WD_SHORT.map((_, i) => [i, s.gym_plan?.[i] || ''])));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = { ...f, gym_plan: plan };
      for (const k of ['toeic_target', 'calories', 'protein', 'carbs', 'fat', 'water', 'weight_goal', 'toeic_exam', 'sex', 'age', 'height', 'goal_note']) if (body[k] === '') body[k] = null;
      onSaved(await api.saveSettings(body));
    } catch (e2) { setErr(e2.message); setBusy(false); }
  }

  const row = (label, k, props = {}) => (
    <div><label>{label}</label><input className="input" value={f[k]} onChange={set(k)} {...props} /></div>
  );
  const nums = { inputMode: 'decimal' };
  return (
    <Sheet title="Mục tiêu & cài đặt" onClose={onClose} onSubmit={save}>
      {err && <div className="err">{err}</div>}
      <div className="field"><label>Hồ sơ cho PT ảo</label></div>
      <div className="field two">
        <div><label>Giới tính</label>
          <select className="input" value={f.sex} onChange={set('sex')}><option value="">Không nói</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select>
        </div>
        {row('Tuổi', 'age', nums)}
      </div>
      <div className="field two">{row('Chiều cao (cm)', 'height', nums)}<span /></div>
      <div className="field"><label>Mục tiêu của bạn</label><input className="input" value={f.goal_note} maxLength={300} onChange={set('goal_note')} placeholder="VD: slim fit, vai rộng, bụng rõ, tăng cơ giảm mỡ" /></div>
      <div className="field"><label>Giấc ngủ</label></div>
      <div className="field two">{row('Giờ ngủ mục tiêu', 'bed', { type: 'time' })}{row('Giờ dậy mục tiêu', 'wake', { type: 'time' })}</div>
      <div className="field"><label>TOEIC</label></div>
      <div className="field two">{row('Điểm mục tiêu', 'toeic_target', nums)}{row('Ngày thi', 'toeic_exam', { type: 'date' })}</div>
      <div className="field"><label>Dinh dưỡng mỗi ngày (mặc định tham khảo, hãy chỉnh theo bạn)</label></div>
      <div className="field two">{row('Calories (kcal)', 'calories', nums)}{row('Protein (g)', 'protein', nums)}</div>
      <div className="field two">{row('Carbs (g)', 'carbs', nums)}{row('Fat (g)', 'fat', nums)}</div>
      <div className="field two">{row('Nước (ml)', 'water', nums)}{row('Cân nặng mục tiêu (kg)', 'weight_goal', nums)}</div>
      <div className="field"><label>Lịch tập trong tuần (để trống = nghỉ)</label></div>
      <div className="plan-grid">
        {WD_SHORT.map((w, i) => (
          <label key={w}><b>{w}</b>
            <input className="input" value={plan[i]} maxLength={40} placeholder="Nghỉ" onChange={(e) => setPlan((p) => ({ ...p, [i]: e.target.value }))} />
          </label>
        ))}
      </div>
      <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      <div className="btn-row"><button type="button" className="btn ghost" onClick={onClose}>Hủy</button></div>
    </Sheet>
  );
}
