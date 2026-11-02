import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { SESSION_KEY, itemFromLib, sessionSig, suggest, videoUrl } from '../program.js';
import { todayISO } from '../utils.js';

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const rowsFor = (item, workouts) => {
  const sg = suggest(item, workouts);
  return Array.from({ length: item.sets }, () => ({ w: sg.weight === '' ? '' : String(sg.weight), r: '', done: false }));
};

// Tiến độ buổi tập đang làm được lưu trên máy (khóa "cache:" nên tự xóa khi đăng xuất); tải lại trang vẫn còn
function init(program, dayIdx, workouts) {
  const day = program.days[dayIdx];
  const sig = sessionSig(program, day);
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (s && s.v === 2 && s.sig === sig && s.date === todayISO()) return s;
  } catch { /* bỏ qua */ }
  const items = day.items.map((x) => ({ ...x }));
  return { v: 2, sig, date: todayISO(), i: 0, items, sets: items.map((x) => rowsFor(x, workouts)) };
}

export default function WorkoutRunner({ program, dayIdx, workouts, onClose, onSaved }) {
  const day = program.days[dayIdx];
  const [s, setS] = useState(() => init(program, dayIdx, workouts));
  const [rest, setRest] = useState(null); // { endAt, total }
  const [, tick] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const topRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* bỏ qua */ } }, [s]);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { topRef.current?.scrollIntoView({ block: 'start' }); }, [s.i]);

  const item = s.items[s.i];
  const rows = s.sets[s.i] || [];
  const timed = item.timed;
  const sg = useMemo(() => suggest(item, workouts), [item, workouts]);
  const left = rest ? Math.max(0, Math.round((rest.endAt - Date.now()) / 1000)) : 0;

  useEffect(() => {
    if (rest && left === 0) { try { navigator.vibrate?.([200, 100, 200]); } catch { /* bỏ qua */ } setRest(null); }
  }, [rest, left]);

  const setRow = (k, patch) => setS((o) => ({ ...o, sets: o.sets.map((rs, a) => (a !== o.i ? rs : rs.map((r, j) => (j === k ? { ...r, ...patch } : r)))) }));
  function toggle(k) {
    const row = rows[k];
    if (!row.done && !(Number(row.r) > 0)) return setErr(timed ? 'Nhập số giây trước khi đánh dấu xong' : 'Nhập số reps đã làm trước khi đánh dấu xong');
    setErr('');
    setRow(k, { done: !row.done });
    if (!row.done && item.rest) setRest({ endAt: Date.now() + item.rest * 1000, total: item.rest });
  }
  const addSet = () => setS((o) => ({ ...o, sets: o.sets.map((rs, a) => (a === o.i ? [...rs, { ...(rs[rs.length - 1] || { w: '', r: '' }), r: '', done: false }] : rs)) }));
  function swap(altKey) {
    const next = itemFromLib(altKey, { sets: item.sets, reps: item.reps, rest: item.rest });
    setS((o) => ({ ...o, items: o.items.map((x, a) => (a === o.i ? next : x)), sets: o.sets.map((rs, a) => (a === o.i ? rowsFor(next, workouts) : rs)) }));
  }
  const go = (n) => { setRest(null); setErr(''); setS((o) => ({ ...o, i: Math.max(0, Math.min(o.items.length - 1, o.i + n)) })); };

  const doneCount = (a) => (s.sets[a] || []).filter((r) => r.done).length;
  const totalDone = s.sets.reduce((a, rs) => a + rs.filter((r) => r.done).length, 0);

  async function finish() {
    const sets = [];
    s.items.forEach((it, a) => s.sets[a].forEach((r) => { if (r.done && Number(r.r) > 0) sets.push({ exercise: it.name, reps: Math.round(Number(r.r)), weight: it.timed ? 0 : Number(r.w) || 0 }); }));
    if (!sets.length) return setErr('Chưa có hiệp nào được đánh dấu xong');
    const planned = s.sets.reduce((a, rs) => a + rs.length, 0);
    if (sets.length < planned && !confirm(`Bạn mới xong ${sets.length}/${planned} hiệp. Vẫn lưu buổi tập này?`)) return;
    setBusy(true); setErr('');
    try {
      await api.post('/api/workouts', { done_on: todayISO(), name: day.title, sets });
      localStorage.removeItem(SESSION_KEY);
      onSaved(sets.length);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  const last = s.i === s.items.length - 1;
  return (
    <div className="runner">
      <div ref={topRef} />
      <div className="rtop">
        <div className="rhead">
          <button className="x" aria-label="Đóng" onClick={() => { if (totalDone === 0 || confirm('Thoát? Tiến độ vẫn được giữ, mở lại để tập tiếp.')) onClose(); }}>✕</button>
          <div className="rtitle"><b>{day.title}</b><small>Bài {s.i + 1}/{s.items.length} · đã xong {totalDone} hiệp</small></div>
          <button className="chip on" disabled={busy || totalDone === 0} onClick={finish}>Lưu</button>
        </div>
        <div className="rdots">
          {s.items.map((_, a) => <i key={a} className={(a === s.i ? 'cur ' : '') + (doneCount(a) === s.sets[a].length && doneCount(a) > 0 ? 'full' : doneCount(a) ? 'part' : '')} onClick={() => go(a - s.i)} />)}
        </div>
        {rest && (
          <div className="resttimer">
            <div className="rbar"><i style={{ width: `${(left / rest.total) * 100}%` }} /></div>
            <b>Nghỉ {mmss(left)}</b>
            <button onClick={() => setRest((r) => ({ ...r, endAt: r.endAt + 30000, total: r.total + 30 }))}>+30s</button>
            <button onClick={() => setRest(null)}>Bỏ qua</button>
          </div>
        )}
      </div>

      <div className="rbody">
        <div className="card pad">
          <div className="exname">{item.name}</div>
          {item.vi && item.vi.toLowerCase() !== item.name.toLowerCase() && <div className="exvi">{item.vi}</div>}
          <div className="chips-wrap tight" style={{ margin: '8px 0 12px' }}>
            {item.muscle && <span className="hchip on">{item.muscle}</span>}
            <span className="hchip on">{item.sets} hiệp × {item.reps[0] === item.reps[1] ? item.reps[0] : `${item.reps[0]}–${item.reps[1]}`} {timed ? 'giây' : 'reps'}</span>
            <span className="hchip on">Nghỉ {mmss(item.rest)}</span>
          </div>
          {item.note && <div className="pnote">📝 {item.note}</div>}
          {item.cues.length > 0 && <ul className="cues">{item.cues.map((c, k) => <li key={k}>{c}</li>)}</ul>}
          <div className="rlinks">
            <a href={videoUrl(item)} target="_blank" rel="noreferrer">▶ Xem video hướng dẫn</a>
            {item.alts.map((a) => <button key={a.key} onClick={() => swap(a.key)}>↻ Đổi: {a.vi}</button>)}
          </div>
        </div>

        <div className="tip" style={{ margin: '12px 0' }}>
          {s.i === 0 && '🔥 Khởi động 5 phút và 1–2 hiệp nhẹ trước khi vào hiệp chính. '}
          {sg.text}
          {sg.last && <> <b>Lần trước:</b> {sg.last.map((x) => `${x.weight}kg × ${x.reps}`).join(', ')}.</>}
        </div>

        <div className="card pad">
          <div className="setrow head"><span>#</span><span>{timed ? '' : 'kg'}</span><span /><span>{timed ? 'giây' : 'reps'}</span><span /></div>
          {rows.map((r, k) => (
            <div className={'setrow' + (r.done ? ' done' : '')} key={k}>
              <span>{k + 1}</span>
              {timed ? <span /> : <input className="input" inputMode="decimal" placeholder="kg" value={r.w} onChange={(e) => setRow(k, { w: e.target.value.replace(',', '.') })} />}
              <em>{timed ? '' : '×'}</em>
              <input className="input" inputMode="numeric" placeholder={item.reps[0] === item.reps[1] ? String(item.reps[0]) : `${item.reps[0]}–${item.reps[1]}`} value={r.r} onChange={(e) => setRow(k, { r: e.target.value.replace(/\D/g, '') })} />
              <button className={'check' + (r.done ? ' on' : '')} aria-label="Xong hiệp" onClick={() => toggle(k)}>{r.done ? '✓' : ''}</button>
            </div>
          ))}
          <button className="addset" onClick={addSet}>+ Thêm hiệp</button>
          {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
        </div>
        <div className="hint light" style={{ textAlign: 'center' }}>Đau nhói (khác với mỏi cơ) thì dừng bài đó và đổi bài hoặc nghỉ.</div>
      </div>

      <div className="rnav">
        <button className="btn ghost" disabled={s.i === 0} onClick={() => go(-1)}>‹ Bài trước</button>
        {last ? <button className="btn" disabled={busy} onClick={finish}>{busy ? 'Đang lưu…' : 'Hoàn thành buổi tập'}</button> : <button className="btn" onClick={() => go(1)}>Bài tiếp ›</button>}
      </div>
    </div>
  );
}
