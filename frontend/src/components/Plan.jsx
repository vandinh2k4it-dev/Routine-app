import React, { useRef, useState } from 'react';
import { api } from '../api.js';
import { shrinkImage } from '../image.js';
import { WD_SHORT } from '../utils.js';

const repsText = (x) => `${x.reps[0] === x.reps[1] ? x.reps[0] : `${x.reps[0]}–${x.reps[1]}`}${x.timed ? 's' : ''}`;

/** PT AI lập lộ trình tập và thực đơn từ khảo sát. Người dùng xem, yêu cầu chỉnh, rồi mới chốt. */
export default function Plan({ onDone, onSkip }) {
  const [photo, setPhoto] = useState(null); // ảnh body mong muốn (chỉ gửi cho AI, không lưu)
  const [feedback, setFeedback] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setPhoto(await shrinkImage(file)); setErr(''); } catch (e2) { setErr(e2.message); }
  }

  async function generate() {
    setBusy(true); setErr('');
    try {
      setResult(await api.post('/api/ai/plan', { photo: photo || undefined, feedback: result ? feedback : undefined }));
      setFeedback('');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function accept() {
    setSaving(true); setErr('');
    try {
      await api.put('/api/program', { name: result.program.name, days: result.program.days });
      const n = result.nutrition;
      const settings = await api.saveSettings({ calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat, water: n.water, meal_plan: result.meal_plan || null });
      onDone(settings);
    } catch (e) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="page">
      <div className="topbar">
        <div><h1 className="title">Lộ trình của bạn</h1></div>
        {onSkip && <button className="chip" onClick={onSkip}>Để sau</button>}
      </div>
      {err && <div className="err">{err}</div>}

      {!result && (
        <div className="card pad">
          <p className="hint" style={{ marginTop: 0 }}>PT sẽ lên lịch tập theo số buổi, thời gian, kinh nghiệm và chấn thương bạn đã khai, kèm lượng calo và thực đơn mẫu mỗi ngày.</p>
          <div className="field">
            <label>Ảnh body bạn muốn hướng tới (không bắt buộc)</label>
            <p className="hint" style={{ margin: '0 0 8px' }}>PT dùng ảnh để biết nên nhấn nhóm cơ nào (vai, ngực, tay…). Ảnh chỉ gửi cho AI một lần, không được lưu lại.</p>
            {photo ? (
              <div className="btn-row" style={{ marginTop: 0 }}>
                <img src={photo} alt="Body mong muốn" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 12 }} />
                <button type="button" className="btn ghost" onClick={() => setPhoto(null)}>Bỏ ảnh</button>
              </div>
            ) : (
              <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>🖼️ Chọn ảnh</button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
          </div>
          <button className="btn" disabled={busy} onClick={generate}>{busy ? 'PT đang lên lộ trình…' : '🤖 Lên lộ trình cho tôi'}</button>
          {busy && <div className="hint light" style={{ textAlign: 'center' }}>Khoảng 20–40 giây.</div>}
        </div>
      )}

      {result && (
        <>
          {result.summary && <div className="tip">{result.summary}</div>}

          <div className="section-title">{result.program.name}</div>
          {result.program.days.map((d, i) => (
            <div className="card pad" key={i} style={{ marginBottom: 10 }}>
              <b>{WD_SHORT[d.weekday]} · {d.title}</b>
              <ul className="cues" style={{ marginTop: 8 }}>
                {d.items.map((x, k) => <li key={k}>{x.name}: {x.sets} × {repsText(x)}{x.note ? ` (${x.note})` : ''}</li>)}
              </ul>
            </div>
          ))}

          <div className="section-title">Mỗi ngày ăn</div>
          <div className="card pad">
            <b>{result.nutrition.calories} kcal</b>
            <p className="hint" style={{ margin: '4px 0 0' }}>Protein {result.nutrition.protein}g · Carbs {result.nutrition.carbs}g · Fat {result.nutrition.fat}g · Nước {result.nutrition.water}ml</p>
            {result.meal_plan && <div className="mealplan">{result.meal_plan}</div>}
          </div>
          <p className="hint light">Đây là gợi ý tham khảo, không thay thế bác sĩ hay chuyên gia dinh dưỡng. Bạn đau hoặc có bệnh nền thì hãy hỏi bác sĩ trước khi tập.</p>

          <div className="card pad" style={{ marginTop: 10 }}>
            <label>Muốn chỉnh gì không?</label>
            <input className="input" value={feedback} maxLength={400} onChange={(e) => setFeedback(e.target.value)} placeholder="VD: thêm bài tay, bớt bài chân, không có máy cáp" />
            <button className="btn ghost" style={{ marginTop: 8 }} disabled={busy || saving || !feedback.trim()} onClick={generate}>{busy ? 'PT đang chỉnh…' : 'Chỉnh lại'}</button>
          </div>
          <div className="btn-row">
            <button className="btn" disabled={saving || busy} onClick={accept}>{saving ? 'Đang lưu…' : '✓ Dùng lộ trình này'}</button>
          </div>
        </>
      )}
    </div>
  );
}
