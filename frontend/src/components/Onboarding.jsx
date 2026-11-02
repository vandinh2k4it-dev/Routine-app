import React, { useRef, useState } from 'react';
import { api } from '../api.js';
import { shrinkImage } from '../image.js';
import { todayISO } from '../utils.js';

const GOALS = [
  ['fat_loss', '🔥 Giảm mỡ'], ['muscle_gain', '💪 Tăng cơ'], ['recomp', '⚖️ Tăng cơ giảm mỡ'], ['fit', '🏃 Khỏe và săn chắc'],
];
const LEVELS = [['beginner', 'Mới tập'], ['intermediate', 'Đã tập 6 tháng–2 năm'], ['advanced', 'Trên 2 năm']];
const PLACES = [['gym', 'Phòng gym'], ['dumbbell', 'Tạ đơn ở nhà'], ['home', 'Không dụng cụ']];
const STEPS = ['Về bạn', 'Cơ thể', 'Mục tiêu', 'Lịch tập'];
const SCAN_KEYS = ['weight', 'body_fat', 'muscle_mass', 'fat_mass', 'bmi', 'visceral_fat', 'bmr'];

function Choice({ value, onChange, options }) {
  return <div className="chips-wrap">{options.map(([v, l]) => <button key={v} type="button" className={'hchip' + (value === v ? ' on' : '')} onClick={() => onChange(v)}>{l}</button>)}</div>;
}

/** Khảo sát lần đầu: lưu hồ sơ, mục tiêu, lịch tập vào cài đặt và số đo vào lịch sử cơ thể. */
export default function Onboarding({ settings, onDone, onSkip }) {
  const s = settings || {};
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    sex: s.sex || 'male', age: s.age ?? '', height: s.height ?? '', weight: '', body_fat: '',
    goal: s.goal || '', weight_goal: s.weight_goal ?? '', goal_note: s.goal_note || '',
    days_per_week: s.days_per_week || 4, session_min: s.session_min || 60, experience: s.experience || '', equipment: s.equipment || 'gym', injuries: s.injuries || '',
  });
  const [scan, setScan] = useState(null); // số liệu AI đọc từ phiếu InBody
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const setDec = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value.replace(',', '.') }));
  const pick = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const num = (v) => (v === '' || v === null ? null : Number(v));

  async function onPickScan(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setScanning(true);
    try {
      const r = await api.post('/api/ai/inbody', { image: await shrinkImage(file) });
      if (!r.is_body_report) throw new Error('Ảnh này không giống phiếu đo InBody. Hãy chụp rõ cả tờ phiếu rồi thử lại.');
      setScan(r);
      setF((x) => ({ ...x, weight: r.weight ?? x.weight, body_fat: r.body_fat ?? x.body_fat }));
    } catch (e2) { setErr(e2.message); }
    setScanning(false);
  }

  function next() {
    setErr('');
    if (step === 0) {
      if (!(num(f.age) >= 12 && num(f.age) <= 90)) return setErr('Nhập tuổi từ 12 đến 90');
      if (!(num(f.height) >= 120 && num(f.height) <= 230)) return setErr('Nhập chiều cao từ 120 đến 230 cm');
    }
    if (step === 1 && !(num(f.weight) >= 30 && num(f.weight) <= 300)) return setErr('Nhập cân nặng hiện tại (kg)');
    if (step === 2 && !f.goal) return setErr('Chọn mục tiêu của bạn');
    if (step === 3) return finish();
    setStep(step + 1);
  }

  async function finish() {
    if (!f.experience) return setErr('Chọn mức kinh nghiệm của bạn');
    setBusy(true);
    try {
      const saved = await api.saveSettings({
        sex: f.sex, age: num(f.age), height: num(f.height), goal: f.goal, weight_goal: num(f.weight_goal), goal_note: f.goal_note.trim() || null,
        days_per_week: Number(f.days_per_week), session_min: Number(f.session_min), experience: f.experience, equipment: f.equipment, injuries: f.injuries.trim() || null,
        onboarded: todayISO(),
      });
      const body = { on_date: scan?.measured_on || todayISO(), weight: num(f.weight) };
      if (num(f.body_fat) !== null) body.body_fat = num(f.body_fat);
      if (scan) for (const k of SCAN_KEYS) if (scan[k] !== null && scan[k] !== undefined) body[k] = scan[k];
      await api.put('/api/body', body);
      onDone(saved);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="page onboard">
      <div className="topbar">
        <div><h1 className="title">Làm quen với PT của bạn</h1></div>
        {onSkip && <button className="chip" onClick={onSkip}>Để sau</button>}
      </div>
      <div className="obsteps">{STEPS.map((t, i) => <span key={t} className={i === step ? 'on' : i < step ? 'done' : ''}>{t}</span>)}</div>
      {err && <div className="err">{err}</div>}

      {step === 0 && (
        <div className="card pad">
          <p className="hint" style={{ marginTop: 0 }}>Vài câu hỏi để PT lên lộ trình đúng với bạn. Chỉ mất khoảng 1 phút.</p>
          <div className="field"><label>Giới tính</label><Choice value={f.sex} onChange={pick('sex')} options={[['male', 'Nam'], ['female', 'Nữ'], ['other', 'Khác']]} /></div>
          <div className="field two">
            <div><label>Tuổi</label><input className="input" inputMode="numeric" value={f.age} onChange={set('age')} /></div>
            <div><label>Chiều cao (cm)</label><input className="input" inputMode="numeric" value={f.height} onChange={set('height')} /></div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card pad">
          <div className="field two">
            <div><label>Cân nặng (kg)</label><input className="input" inputMode="decimal" value={f.weight} onChange={setDec('weight')} /></div>
            <div><label>Body fat % (nếu biết)</label><input className="input" inputMode="decimal" value={f.body_fat} onChange={setDec('body_fat')} /></div>
          </div>
          <p className="hint">Phòng gym có máy InBody thì chụp phiếu đo, AI sẽ đọc giúp. Không có thì bỏ qua.</p>
          <button type="button" className="btn ghost scan" disabled={scanning} onClick={() => fileRef.current?.click()}>{scanning ? 'AI đang đọc…' : '📷 Quét phiếu InBody'}</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickScan} />
          {scan && <div className="tip" style={{ marginTop: 10 }}>Đã đọc phiếu: cân {scan.weight ?? '—'}kg, body fat {scan.body_fat ?? '—'}%, cơ {scan.muscle_mass ?? '—'}kg. Bạn kiểm tra lại các ô phía trên nhé.</div>}
        </div>
      )}

      {step === 2 && (
        <div className="card pad">
          <div className="field"><label>Mục tiêu chính</label><Choice value={f.goal} onChange={pick('goal')} options={GOALS} /></div>
          <div className="field two">
            <div><label>Cân nặng mong muốn (kg)</label><input className="input" inputMode="decimal" placeholder="Có thể bỏ trống" value={f.weight_goal} onChange={setDec('weight_goal')} /></div>
            <span />
          </div>
          <div className="field"><label>Body bạn muốn trông thế nào?</label><input className="input" value={f.goal_note} maxLength={300} onChange={set('goal_note')} placeholder="VD: slim fit, vai rộng, bụng rõ" /></div>
        </div>
      )}

      {step === 3 && (
        <div className="card pad">
          <div className="field"><label>Mỗi tuần tập mấy buổi?</label><Choice value={Number(f.days_per_week)} onChange={pick('days_per_week')} options={[2, 3, 4, 5, 6].map((n) => [n, `${n} buổi`])} /></div>
          <div className="field"><label>Mỗi buổi tập bao lâu?</label><Choice value={Number(f.session_min)} onChange={pick('session_min')} options={[[30, '30 phút'], [45, '45 phút'], [60, '1 giờ'], [90, '1,5 giờ']]} /></div>
          <div className="field"><label>Kinh nghiệm</label><Choice value={f.experience} onChange={pick('experience')} options={LEVELS} /></div>
          <div className="field"><label>Tập ở đâu</label><Choice value={f.equipment} onChange={pick('equipment')} options={PLACES} /></div>
          <div className="field"><label>Chấn thương hoặc vấn đề sức khỏe</label><input className="input" value={f.injuries} maxLength={300} onChange={set('injuries')} placeholder="Không có thì để trống. VD: đau vai phải, đau lưng dưới" /></div>
        </div>
      )}

      <div className="btn-row">
        {step > 0 && <button className="btn ghost" onClick={() => { setErr(''); setStep(step - 1); }}>Quay lại</button>}
        <button className="btn" disabled={busy} onClick={next}>{step === 3 ? (busy ? 'Đang lưu…' : 'Hoàn tất') : 'Tiếp tục'}</button>
      </div>
    </div>
  );
}
