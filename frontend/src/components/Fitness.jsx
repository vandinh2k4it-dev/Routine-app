import React, { useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { Columns, LineChart, Meter } from './charts.jsx';
import { Empty, Field, Loading, PageHead, Seg, Sheet } from './ui.jsx';
import WorkoutRunner from './WorkoutRunner.jsx';
import ProgramSheet from './ProgramSheet.jsx';
import { PROGRAM, dayForWeekday, estimateMinutes } from '../program.js';
import { WD_SHORT, addDays, fromISO, num1, startOfWeek, toISO, todayISO, withDefaults, wdIndex } from '../utils.js';

const EXERCISES = ['Bench Press', 'Incline Dumbbell Press', 'Overhead Press', 'Lateral Raise', 'Pull-up', 'Lat Pulldown', 'Barbell Row', 'Squat', 'Romanian Deadlift', 'Leg Press', 'Barbell Curl', 'Triceps Pushdown', 'Plank'];
const ymd = (iso) => { const d = fromISO(iso); return `${d.getDate()}/${d.getMonth() + 1}`; };
const range = (days) => [toISO(addDays(new Date(), -days)), toISO(addDays(new Date(), 1))];
const e1rm = (w, r) => w * (1 + r / 30);

export default function Fitness({ D, onBack, onSettings }) {
  const [tab, setTab] = useState('train');
  const goal = withDefaults(D.settings);
  return (
    <div className="page">
      <PageHead title="Thể hình" onBack={onBack} right={<button className="chip" onClick={onSettings}>🎯 Mục tiêu</button>} />
      <Seg value={tab} onChange={setTab} options={[['train', '🏋️ Tập luyện'], ['body', '📏 Cơ thể'], ['food', '🥗 Dinh dưỡng']]} />
      {tab === 'train' && <Train goal={goal} />}
      {tab === 'body' && <Body goal={goal} />}
      {tab === 'food' && <Food goal={goal} />}
    </div>
  );
}

// ---------------- Tập luyện ----------------
function Train({ goal }) {
  const { data: ws, reload, err } = useLoad(() => api.get('/api/workouts', { from: range(120)[0], to: range(0)[1] }), []);
  const [sheet, setSheet] = useState(null);
  const [ex, setEx] = useState('');
  const [runDay, setRunDay] = useState(null);
  const [progOpen, setProgOpen] = useState(false);
  const [pickIdx, setPickIdx] = useState(() => dayForWeekday(wdIndex(new Date()))?.idx ?? 0);
  const [savedMsg, setSavedMsg] = useState('');
  const today = todayISO();
  const weekStart = startOfWeek(new Date());

  const names = useMemo(() => {
    const c = {};
    (ws || []).forEach((w) => w.sets.forEach((s) => { c[s.exercise] = (c[s.exercise] || 0) + 1; }));
    return Object.keys(c).sort((a, b) => c[b] - c[a]);
  }, [ws]);
  const current = ex || names[0] || '';

  // Mỗi buổi: mức tạ nặng nhất của bài và e1RM ước tính
  const history = useMemo(() => {
    if (!current) return [];
    return [...(ws || [])].reverse().map((w) => {
      const sets = w.sets.filter((s) => s.exercise === current && s.reps > 0);
      if (!sets.length) return null;
      const top = sets.reduce((a, s) => (s.weight > a.weight || (s.weight === a.weight && s.reps > a.reps) ? s : a), sets[0]);
      return { x: ymd(w.done_on), y: top.weight, reps: top.reps, e1: Math.max(...sets.map((s) => e1rm(s.weight, s.reps))), vol: sets.reduce((a, s) => a + s.weight * s.reps, 0) };
    }).filter(Boolean);
  }, [ws, current]);
  const last = history[history.length - 1], prev = history[history.length - 2];

  const lastSets = (name) => {
    const w = (ws || []).find((x) => x.sets.some((s) => s.exercise === name));
    return w ? w.sets.filter((s) => s.exercise === name).map((s) => ({ reps: s.reps, weight: s.weight })) : null;
  };

  if (err) return <div className="err">{err}</div>;
  if (!ws) return <Loading />;

  return (
    <>
      <div className="weekplan">
        {WD_SHORT.map((w, i) => {
          const d = toISO(addDays(weekStart, i));
          const did = ws.some((x) => x.done_on === d);
          return (
            <div key={w} className={'wp' + (d === today ? ' today' : '') + (did ? ' did' : '')}>
              <small>{w}</small>
              <b>{did ? '✓' : ''}</b>
              <span>{goal.gym_plan?.[i] || 'Nghỉ'}</span>
            </div>
          );
        })}
      </div>

      {savedMsg && <div className="tip" style={{ marginTop: 14 }}>{savedMsg}</div>}
      <div className="card pad progcard" style={{ marginTop: 14 }}>
        <small>🎯 Chương trình tập</small>
        <b>{dayForWeekday(wdIndex(new Date())) ? `Hôm nay: ${dayForWeekday(wdIndex(new Date())).title}` : 'Hôm nay nghỉ / đá banh ⚽'}</b>
        <select className="input" value={pickIdx} onChange={(e) => setPickIdx(Number(e.target.value))}>
          {PROGRAM.days.map((d) => <option key={d.idx} value={d.idx}>{WD_SHORT[d.idx]} · {d.title}</option>)}
        </select>
        {(() => {
          const d = dayForWeekday(pickIdx);
          let resume = false;
          try { const r = JSON.parse(localStorage.getItem('cache:session')); resume = r && r.dayIdx === d.idx && r.date === today; } catch { /* bỏ qua */ }
          return (
            <>
              <p>{d.items.length} bài · khoảng {estimateMinutes(d)} phút · {d.focus}</p>
              <button className="btn" onClick={() => { setSavedMsg(''); setRunDay(d); }}>{resume ? '▶ Tiếp tục buổi đang tập' : '▶ Bắt đầu buổi tập'}</button>
            </>
          );
        })()}
        <button className="linkbtn" onClick={() => setProgOpen(true)}>Xem cả chương trình và hướng dẫn từng bài</button>
      </div>
      <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setSheet({ done_on: today, name: goal.gym_plan?.[wdIndex(new Date())] || '' })}>+ Tự ghi buổi tập</button>

      <div className="section-title">Progressive overload</div>
      {!names.length ? (
        <Empty icon="📈" text="Ghi buổi tập đầu tiên để theo dõi mức tạ tăng dần theo từng bài." />
      ) : (
        <div className="card pad">
          <select className="input" value={current} onChange={(e) => setEx(e.target.value)}>
            {names.map((n) => <option key={n}>{n}</option>)}
          </select>
          <div style={{ marginTop: 12 }}><LineChart points={history} unit="kg" color="#ff8a4c" /></div>
          {last && (
            <div className="tri" style={{ marginTop: 12 }}>
              <div><small>Nặng nhất</small><b>{num1(last.y)}kg × {last.reps}</b></div>
              <div><small>e1RM</small><b>{num1(last.e1)}kg</b></div>
              <div><small>So với lần trước</small><b className={prev && last.y >= prev.y ? 'in' : ''}>{prev ? `${last.y - prev.y >= 0 ? '+' : ''}${num1(last.y - prev.y)}kg` : '—'}</b></div>
            </div>
          )}
          <div className="hint">Mẹo: khi làm được đủ số reps mục tiêu ở mọi hiệp, tăng tạ lên một chút ở buổi sau.</div>
        </div>
      )}

      <div className="section-title">Lịch sử <span>{ws.length} buổi / 120 ngày</span></div>
      {!ws.length ? <div className="hint light">Chưa có buổi tập nào.</div> : (
        <div className="card">
          {ws.slice(0, 15).map((w) => {
            const exs = [...new Set(w.sets.map((s) => s.exercise))];
            const vol = w.sets.reduce((a, s) => a + s.reps * s.weight, 0);
            return (
              <button key={w.id} className="item" onClick={() => setSheet(w)}>
                <div className="ico" style={{ background: '#ff8a4c26' }}>🏋️</div>
                <div className="grow">
                  <div className="t">{w.name}</div>
                  <div className="s">{ymd(w.done_on)} · {exs.length} bài · {w.sets.length} hiệp · {Math.round(vol).toLocaleString('vi-VN')}kg tổng tạ</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="tip" style={{ marginTop: 14 }}>💤 Cơ bắp phát triển lúc nghỉ ngơi. Ngủ đủ 7–9 giờ và có ít nhất một ngày nghỉ mỗi tuần.</div>

      {runDay && <WorkoutRunner day={runDay} workouts={ws} onClose={() => setRunDay(null)} onSaved={(n) => { setRunDay(null); setSavedMsg(`Đã lưu buổi tập: ${n} hiệp. Giỏi lắm! 💪`); reload(); }} />}
      {progOpen && <ProgramSheet onClose={() => setProgOpen(false)} onStart={(d) => { setProgOpen(false); setPickIdx(d.idx); setSavedMsg(''); setRunDay(d); }} />}
      {sheet && <WorkoutSheet initial={sheet} names={[...new Set([...names, ...EXERCISES])]} lastSets={lastSets} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); reload(); }} />}
    </>
  );
}

function WorkoutSheet({ initial, names, lastSets, onClose, onSaved }) {
  const editing = !!initial.id;
  const [name, setName] = useState(initial.name || '');
  const [date, setDate] = useState(initial.done_on);
  const [note, setNote] = useState(initial.note || '');
  const [exs, setExs] = useState(() => {
    const map = new Map();
    (initial.sets || []).forEach((s) => { if (!map.has(s.exercise)) map.set(s.exercise, []); map.get(s.exercise).push({ reps: String(s.reps), weight: String(s.weight) }); });
    return [...map].map(([n, sets]) => ({ name: n, sets }));
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const upd = (i, fn) => setExs((a) => a.map((e, j) => (j === i ? fn(e) : e)));
  const addEx = () => setExs((a) => [...a, { name: '', sets: [{ reps: '', weight: '' }] }]);
  const fillFromLast = (i, n) => {
    const prev = lastSets(n);
    if (prev) upd(i, (e) => (e.sets.every((s) => !s.reps && !s.weight) ? { ...e, sets: prev.map((s) => ({ reps: String(s.reps), weight: String(s.weight) })) } : e));
  };

  async function save(e) {
    e.preventDefault();
    const sets = [];
    for (const ex of exs) {
      if (!ex.name.trim()) continue;
      for (const s of ex.sets) if (s.reps !== '' || s.weight !== '') sets.push({ exercise: ex.name.trim(), reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 });
    }
    if (!name.trim()) return setErr('Nhập tên buổi tập');
    if (!sets.length) return setErr('Thêm ít nhất một hiệp');
    setBusy(true); setErr('');
    try {
      const body = { name: name.trim(), done_on: date, note: note.trim() || null, sets };
      if (editing) await api.put(`/api/workouts/${initial.id}`, body); else await api.post('/api/workouts', body);
      onSaved();
    } catch (e2) { setErr(e2.message); setBusy(false); }
  }
  async function del() {
    if (!confirm('Xóa buổi tập này?')) return;
    setBusy(true);
    try { await api.del(`/api/workouts/${initial.id}`); onSaved(); } catch (e2) { setErr(e2.message); setBusy(false); }
  }

  return (
    <Sheet title={editing ? 'Sửa buổi tập' : 'Ghi buổi tập'} onClose={onClose} onSubmit={save}>
      {err && <div className="err">{err}</div>}
      <div className="field two">
        <div><label>Buổi tập</label><input className="input" value={name} maxLength={60} placeholder="VD: Ngực + Tay" onChange={(e) => setName(e.target.value)} /></div>
        <div><label>Ngày</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <datalist id="exlist">{names.map((n) => <option key={n} value={n} />)}</datalist>
      {exs.map((ex, i) => (
        <div className="exblock" key={i}>
          <div className="exhead">
            <input className="input" list="exlist" placeholder="Tên bài tập" value={ex.name} onChange={(e) => upd(i, (o) => ({ ...o, name: e.target.value }))} onBlur={(e) => fillFromLast(i, e.target.value.trim())} />
            <button type="button" className="x" aria-label="Xóa bài" onClick={() => setExs((a) => a.filter((_, j) => j !== i))}>✕</button>
          </div>
          {ex.sets.map((s, k) => (
            <div className="setrow" key={k}>
              <span>{k + 1}</span>
              <input className="input" inputMode="decimal" placeholder="kg" value={s.weight} onChange={(e) => upd(i, (o) => ({ ...o, sets: o.sets.map((x, j) => (j === k ? { ...x, weight: e.target.value } : x)) }))} />
              <em>kg ×</em>
              <input className="input" inputMode="numeric" placeholder="reps" value={s.reps} onChange={(e) => upd(i, (o) => ({ ...o, sets: o.sets.map((x, j) => (j === k ? { ...x, reps: e.target.value } : x)) }))} />
              <button type="button" className="x" aria-label="Xóa hiệp" onClick={() => upd(i, (o) => ({ ...o, sets: o.sets.length > 1 ? o.sets.filter((_, j) => j !== k) : o.sets }))}>−</button>
            </div>
          ))}
          <button type="button" className="addset" onClick={() => upd(i, (o) => ({ ...o, sets: [...o.sets, { ...(o.sets[o.sets.length - 1] || { reps: '', weight: '' }) }] }))}>+ Thêm hiệp</button>
        </div>
      ))}
      <button type="button" className="btn ghost" style={{ marginBottom: 14 }} onClick={addEx}>+ Thêm bài tập</button>
      <Field label="Ghi chú"><input className="input" value={note} maxLength={300} placeholder="Cảm giác buổi tập, chấn thương…" onChange={(e) => setNote(e.target.value)} /></Field>
      <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu buổi tập'}</button>
      <div className="btn-row">
        {editing && <button type="button" className="btn danger" onClick={del} disabled={busy}>Xóa</button>}
        <button type="button" className="btn ghost" onClick={onClose}>Hủy</button>
      </div>
    </Sheet>
  );
}

// ---------------- Cơ thể ----------------
const METRICS = [
  ['weight', 'Cân nặng', 'kg'], ['body_fat', 'Body fat', '%'], ['muscle_mass', 'Khối lượng cơ', 'kg'],
  ['fat_mass', 'Khối lượng mỡ', 'kg'], ['bmi', 'BMI', ''], ['visceral_fat', 'Mỡ nội tạng', ''], ['bmr', 'BMR', 'kcal'],
  ['waist', 'Vòng eo', 'cm'], ['chest', 'Vòng ngực', 'cm'], ['arm', 'Vòng tay', 'cm'], ['shoulder', 'Vòng vai', 'cm'],
];
const SCAN_KEYS = ['weight', 'body_fat', 'muscle_mass', 'fat_mass', 'bmi', 'visceral_fat', 'bmr'];

/** Thu nhỏ ảnh về tối đa 1600px, JPEG 85%: đủ rõ để đọc chữ số, nhẹ để gửi nhanh. */
async function shrinkImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không mở được ảnh này')); i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally { URL.revokeObjectURL(url); }
}

function Body({ goal }) {
  const { data: rows, reload, err } = useLoad(() => api.get('/api/body', { from: range(365)[0], to: range(0)[1] }), []);
  const [metric, setMetric] = useState('weight');
  const [open, setOpen] = useState(false); // false | true | { prefill }
  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState('');
  const fileRef = useRef(null);
  if (err) return <div className="err">{err}</div>;
  if (!rows) return <Loading />;
  const [, label, unit] = METRICS.find((m) => m[0] === metric);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScanErr(''); setScanning(true);
    try {
      const image = await shrinkImage(file);
      const r = await api.post('/api/ai/inbody', { image });
      if (!r.is_body_report) throw new Error('Ảnh này không giống phiếu đo InBody. Hãy chụp rõ cả tờ phiếu rồi thử lại.');
      setOpen({ prefill: r });
    } catch (e2) { setScanErr(e2.message); }
    setScanning(false);
  }
  const pts = rows.filter((r) => r[metric] !== null).map((r) => ({ x: ymd(r.on_date), y: r[metric] }));
  const latest = (k) => [...rows].reverse().find((r) => r[k] !== null)?.[k] ?? null;
  const first = (k) => rows.find((r) => r[k] !== null)?.[k] ?? null;

  return (
    <>
      <div className="btn-row" style={{ marginTop: 0 }}>
        <button className="btn" onClick={() => setOpen(true)}>+ Ghi số đo</button>
        <button className="btn ghost scan" disabled={scanning} onClick={() => fileRef.current?.click()}>{scanning ? 'AI đang đọc…' : '📷 Quét phiếu InBody'}</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
      </div>
      {scanning && <div className="hint light" style={{ textAlign: 'center' }}>Đang gửi ảnh cho AI đọc, khoảng 10–20 giây…</div>}
      {scanErr && <div className="err" style={{ marginTop: 10 }}>{scanErr}</div>}
      <div className="card pad" style={{ marginTop: 14 }}>
        <div className="chips-wrap tight">
          {METRICS.filter(([k]) => k === 'weight' || latest(k) !== null).map(([k, l]) => <button key={k} className={'hchip' + (metric === k ? ' on' : '')} onClick={() => setMetric(k)}>{l}</button>)}
        </div>
        <div style={{ marginTop: 10 }}><LineChart points={pts} unit={unit} color="#6d4aff" /></div>
        {metric === 'weight' && goal.weight_goal && latest('weight') !== null && (
          <div className="hint">Mục tiêu {goal.weight_goal}kg · còn {num1(Math.abs(latest('weight') - goal.weight_goal))}kg {latest('weight') > goal.weight_goal ? 'cần giảm' : 'cần tăng'}</div>
        )}
      </div>
      <div className="section-title">Hiện tại so với lúc bắt đầu</div>
      <div className="card">
        {METRICS.filter(([k]) => latest(k) !== null).map(([k, l, u]) => {
          const a = latest(k), b = first(k);
          const diff = a !== null && b !== null ? a - b : null;
          return (
            <div className="item" key={k}>
              <div className="grow"><div className="t">{l}</div></div>
              <div className="amt">{a !== null ? `${num1(a)}${u}` : '—'}</div>
              {diff !== null && rows.filter((r) => r[k] !== null).length > 1 && <span className={'s delta' + (diff > 0 ? ' up' : '')}>{diff > 0 ? '+' : ''}{num1(diff)}</span>}
            </div>
          );
        })}
      </div>
      <div className="hint light" style={{ textAlign: 'center', marginTop: 10 }}>Nên đo cùng thời điểm (sáng, sau khi đi vệ sinh) để số liệu dễ so sánh.</div>
      {open && <BodySheet prefill={open.prefill} last={Object.fromEntries(METRICS.map(([k]) => [k, latest(k)]))} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </>
  );
}

function BodySheet({ last, prefill, onClose, onSaved }) {
  const [date, setDate] = useState(prefill?.measured_on || todayISO());
  // Quét AI: chỉ điền những số AI đọc được, các ô còn lại để trống để không ghi đè số cũ
  const [f, setF] = useState(Object.fromEntries(METRICS.map(([k]) => [k, prefill ? prefill[k] ?? '' : last[k] ?? ''])));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    const body = { on_date: date };
    for (const [k] of METRICS) if (f[k] !== '' && f[k] !== null) body[k] = Number(f[k]);
    if (Object.keys(body).length < 2) return setErr('Nhập ít nhất một số đo');
    setBusy(true); setErr('');
    try { await api.put('/api/body', body); onSaved(); } catch (e2) { setErr(e2.message); setBusy(false); }
  }
  return (
    <Sheet title={prefill ? 'Kết quả quét phiếu' : 'Ghi số đo'} onClose={onClose} onSubmit={save}>
      {err && <div className="err">{err}</div>}
      {prefill && (
        <div className="tip" style={{ marginTop: 0, marginBottom: 14 }}>
          🤖 AI đọc từ ảnh (độ chắc: {{ high: 'cao', medium: 'vừa', low: 'thấp' }[prefill.confidence]}). <b>Hãy đối chiếu từng số với phiếu rồi mới lưu</b>, vì AI có thể đọc sai.
          {prefill.note ? ` ${prefill.note}` : ''} Ảnh không được lưu lại.
        </div>
      )}
      <Field label="Ngày đo"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="grid-fields">
        {METRICS.filter(([k]) => !prefill || SCAN_KEYS.includes(k) || f[k] !== '').map(([k, l, u]) => (
          <div key={k}><label>{l}{u ? ` (${u})` : ''}</label><input className="input" inputMode="decimal" value={f[k]} onChange={(e) => setF((o) => ({ ...o, [k]: e.target.value.replace(',', '.') }))} /></div>
        ))}
      </div>
      <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      <div className="btn-row"><button type="button" className="btn ghost" onClick={onClose}>Hủy</button></div>
    </Sheet>
  );
}

// ---------------- Dinh dưỡng ----------------
function Food({ goal }) {
  const { data: rows, reload, err } = useLoad(() => api.get('/api/nutrition', { from: range(13)[0], to: range(0)[1] }), []);
  const [open, setOpen] = useState(false);
  const today = todayISO();
  if (err) return <div className="err">{err}</div>;
  if (!rows) return <Loading />;
  const t = rows.find((r) => r.on_date === today) || {};
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = toISO(addDays(new Date(), i - 6));
    const r = rows.find((x) => x.on_date === d);
    return { label: WD_SHORT[(fromISO(d).getDay() + 6) % 7], value: r?.calories || 0, text: r?.calories ? String(Math.round(r.calories / 100) / 10) + 'k' : '' };
  });
  const addWater = async (ml) => {
    try { await api.put('/api/nutrition', { on_date: today, water: (t.water || 0) + ml }); reload(); } catch { /* bỏ qua */ }
  };
  return (
    <>
      <div className="card pad">
        <Meter label="Calories" value={t.calories || 0} goal={goal.calories} unit=" kcal" color="#ff8a4c" />
        <Meter label="Protein" value={t.protein || 0} goal={goal.protein} unit="g" color="#6d4aff" />
        <Meter label="Carbs" value={t.carbs || 0} goal={goal.carbs} unit="g" color="#f2c94c" />
        <Meter label="Fat" value={t.fat || 0} goal={goal.fat} unit="g" color="#ff5c8a" />
        <Meter label="Nước" value={t.water || 0} goal={goal.water} unit="ml" color="#3fa9f5" />
        <div className="quick">
          <button type="button" onClick={() => addWater(250)}>+250ml nước</button>
          <button type="button" onClick={() => addWater(500)}>+500ml</button>
        </div>
        <button className="btn" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>Cập nhật hôm nay</button>
      </div>
      <div className="section-title">Calories 7 ngày <span>mục tiêu {goal.calories}</span></div>
      <div className="card pad"><Columns items={week} height={110} max={Math.max(goal.calories, ...week.map((w) => w.value))} /></div>
      <div className="hint light" style={{ textAlign: 'center', marginTop: 10 }}>Mục tiêu dinh dưỡng chỉ là mặc định tham khảo. Bạn chỉnh trong 🎯 Mục tiêu cho hợp với cơ thể và kế hoạch của mình.</div>
      {open && <FoodSheet today={t} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </>
  );
}

function FoodSheet({ today, onClose, onSaved }) {
  const keys = [['calories', 'Calories (kcal)'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fat', 'Fat (g)'], ['water', 'Nước (ml)']];
  const [f, setF] = useState(Object.fromEntries(keys.map(([k]) => [k, today[k] ?? ''])));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    const body = { on_date: todayISO() };
    for (const [k] of keys) body[k] = f[k] === '' ? null : Number(f[k]);
    setBusy(true); setErr('');
    try { await api.put('/api/nutrition', body); onSaved(); } catch (e2) { setErr(e2.message); setBusy(false); }
  }
  return (
    <Sheet title="Dinh dưỡng hôm nay" onClose={onClose} onSubmit={save}>
      {err && <div className="err">{err}</div>}
      <div className="grid-fields">
        {keys.map(([k, l]) => <div key={k}><label>{l}</label><input className="input" inputMode="decimal" value={f[k]} onChange={(e) => setF((o) => ({ ...o, [k]: e.target.value }))} /></div>)}
      </div>
      <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      <div className="btn-row"><button type="button" className="btn ghost" onClick={onClose}>Hủy</button></div>
    </Sheet>
  );
}
