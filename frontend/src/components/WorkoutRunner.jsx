import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { EXERCISES, isTimed, suggest, videoUrl } from '../program.js';
import { todayISO } from '../utils.js';

// Tiến độ buổi tập đang làm được lưu trên máy (khóa "cache:" nên tự xóa khi đăng xuất), tải lại trang vẫn còn
const KEY = 'cache:session';
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function init(day, workouts) {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.dayIdx === day.idx && s.date === todayISO()) return s;
  } catch { /* bỏ qua */ }
  const order = day.items.map((x) => x.ex);
  const sets = {};
  day.items.forEach((x) => {
    const sg = suggest(x.ex, x, workouts);
    sets[x.ex] = Array.from({ length: x.sets }, () => ({ w: sg.weight === '' ? '' : String(sg.weight), r: '', done: false }));
  });
  return { dayIdx: day.idx, date: todayISO(), i: 0, order, sets };
}

export default function WorkoutRunner({ day, workouts, onClose, onSaved }) {
  const [s, setS] = useState(() => init(day, workouts));
  const [rest, setRest] = useState(null); // { endAt, total }
  const [, tick] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const topRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* bỏ qua */ } }, [s]);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { topRef.current?.scrollIntoView({ block: 'start' }); }, [s.i]);

  const item = day.items[s.i];
  const exId = s.order[s.i];
  const ex = EXERCISES[exId];
  const timed = isTimed(exId);
  const rows = s.sets[exId] || [];
  const sg = useMemo(() => suggest(exId, item, workouts), [exId, item, workouts]);
  const left = rest ? Math.max(0, Math.round((rest.endAt - Date.now()) / 1000)) : 0;

  useEffect(() => {
    if (rest && left === 0) { try { navigator.vibrate?.([200, 100, 200]); } catch { /* bỏ qua */ } setRest(null); }
  }, [rest, left]);

  const setRow = (k, patch) => setS((o) => ({ ...o, sets: { ...o.sets, [exId]: o.sets[exId].map((r, j) => (j === k ? { ...r, ...patch } : r)) } }));
  function toggle(k) {
    const row = rows[k];
    if (!row.done && !(Number(row.r) > 0)) return setErr(timed ? 'Nhập số giây trước khi đánh dấu xong' : 'Nhập số reps đã làm trước khi đánh dấu xong');
    setErr('');
    setRow(k, { done: !row.done });
    if (!row.done && item.rest) setRest({ endAt: Date.now() + item.rest * 1000, total: item.rest });
  }
  const addSet = () => setS((o) => ({ ...o, sets: { ...o.sets, [exId]: [...o.sets[exId], { ...o.sets[exId][o.sets[exId].length - 1], r: '', done: false }] } }));
  function swap(alt) {
    setS((o) => {
      const sets = { ...o.sets };
      if (!sets[alt]) {
        const g = suggest(alt, item, workouts);
        sets[alt] = Array.from({ length: item.sets }, () => ({ w: g.weight === '' ? '' : String(g.weight), r: '', done: false }));
      }
      return { ...o, order: o.order.map((x, j) => (j === o.i ? alt : x)), sets };
    });
  }
  const go = (n) => { setRest(null); setErr(''); setS((o) => ({ ...o, i: Math.max(0, Math.min(day.items.length - 1, o.i + n)) })); };

  const doneCount = (id) => (s.sets[id] || []).filter((r) => r.done).length;
  const totalDone = s.order.reduce((a, id) => a + doneCount(id), 0);

  async function finish() {
    const sets = [];
    for (const id of s.order) for (const r of s.sets[id] || []) if (r.done && Number(r.r) > 0) sets.push({ exercise: EXERCISES[id].en, reps: Math.round(Number(r.r)), weight: isTimed(id) ? 0 : Number(r.w) || 0 });
    if (!sets.length) return setErr('Chưa có hiệp nào được đánh dấu xong');
    const planned = s.order.reduce((a, id) => a + (s.sets[id] || []).length, 0);
    if (sets.length < planned && !confirm(`Bạn mới xong ${sets.length}/${planned} hiệp. Vẫn lưu buổi tập này?`)) return;
    setBusy(true); setErr('');
    try {
      await api.post('/api/workouts', { done_on: todayISO(), name: day.title, sets });
      localStorage.removeItem(KEY);
      onSaved(sets.length);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  const last = s.i === day.items.length - 1;
  return (
    <div className="runner">
      <div ref={topRef} />
      <div className="rtop">
      <div className="rhead">
        <button className="x" aria-label="Đóng" onClick={() => { if (totalDone === 0 || confirm('Thoát? Tiến độ vẫn được giữ, mở lại để tập tiếp.')) onClose(); }}>✕</button>
        <div className="rtitle"><b>{day.title}</b><small>Bài {s.i + 1}/{day.items.length} · đã xong {totalDone} hiệp</small></div>
        <button className="chip on" disabled={busy || totalDone === 0} onClick={finish}>Lưu</button>
      </div>
      <div className="rdots">
        {s.order.map((id, j) => <i key={j} className={(j === s.i ? 'cur ' : '') + (doneCount(id) === (s.sets[id] || []).length && doneCount(id) > 0 ? 'full' : doneCount(id) ? 'part' : '')} onClick={() => go(j - s.i)} />)}
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
          <div className="exname">{ex.en}</div>
          <div className="exvi">{ex.vi}</div>
          <div className="chips-wrap tight" style={{ margin: '8px 0 12px' }}>
            <span className="hchip on">{ex.muscle}</span>
            <span className="hchip on">{item.sets} hiệp × {item.reps[0]}–{item.reps[1]} {timed ? 'giây' : 'reps'}</span>
            <span className="hchip on">Nghỉ {mmss(item.rest)}</span>
          </div>
          <ul className="cues">{ex.cues.map((c, k) => <li key={k}>{c}</li>)}</ul>
          <div className="rlinks">
            <a href={videoUrl(exId)} target="_blank" rel="noreferrer">▶ Xem video hướng dẫn</a>
            {ex.alt.filter((a) => a !== exId).map((a) => <button key={a} onClick={() => swap(a)}>↻ Đổi: {EXERCISES[a].vi}</button>)}
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
              <input className="input" inputMode="numeric" placeholder={`${item.reps[0]}–${item.reps[1]}`} value={r.r} onChange={(e) => setRow(k, { r: e.target.value.replace(/\D/g, '') })} />
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
