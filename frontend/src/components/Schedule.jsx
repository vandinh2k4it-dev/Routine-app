import React, { useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { Empty, Loading, PageHead, Seg, Sheet } from './ui.jsx';
import {
  SAMPLE_HABITS, SAMPLE_ROUTINE, WD_SHORT, addDays, byTime, catOf, dayTitle, fromISO, hhmm, itemsOn, logKey,
  minutesOf, startOfWeek, timeLabel, toISO, todayISO,
} from '../utils.js';

const FIRST_H = 5, LAST_H = 24, PX = 1; // 1 phút = 1px (60px / giờ)
const SNAP = 15;
const HEIGHT = (LAST_H - FIRST_H) * 60 * PX;

const habitBody = (h, over = {}) => ({
  title: h.title, category: h.category, kind: h.kind || 'block', days: h.days, once_on: h.once_on || null,
  start_time: h.start_time, end_time: h.end_time, remind_before: h.remind_before, note: h.note, ...over,
});

/** Chia lane để các việc trùng giờ nằm cạnh nhau. */
function layout(items) {
  const sorted = [...items].sort((a, b) => minutesOf(a.start_time) - minutesOf(b.start_time) || a.id - b.id);
  const out = [];
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    for (const it of cluster) {
      let lane = lanes.findIndex((end) => end <= it._s);
      if (lane < 0) { lane = lanes.length; lanes.push(0); }
      lanes[lane] = it._e;
      it._lane = lane;
    }
    cluster.forEach((it) => { it._lanes = lanes.length; out.push(it); });
    cluster = [];
  };
  for (const h of sorted) {
    const s = minutesOf(h.start_time);
    const e = h.end_time ? minutesOf(h.end_time) : s + 30;
    const it = { ...h, _s: s, _e: Math.max(e, s + 15) };
    if (cluster.length && s >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it._e);
  }
  if (cluster.length) flush();
  return out;
}

export default function Schedule({ D, onToggle, onEdit, onAdd, reload, flash }) {
  const { habits, exMap, logSet, loaded } = D;
  const [mode, setMode] = useState('day');
  const [date, setDate] = useState(todayISO());
  const [tplOpen, setTplOpen] = useState(false);
  const [move, setMove] = useState(null); // việc vừa kéo, chờ chọn phạm vi áp dụng
  const [drag, setDrag] = useState(null); // { id, delta }
  const dragRef = useRef(null);
  const today = todayISO();
  const isFuture = date > today;
  const d = fromISO(date);

  const all = useMemo(() => itemsOn(habits, exMap, d).sort(byTime), [habits, exMap, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const timed = all.filter((h) => h.kind !== 'habit' && h.start_time);
  const untimed = all.filter((h) => h.kind !== 'habit' && !h.start_time);
  const checks = all.filter((h) => h.kind === 'habit');
  const placed = useMemo(() => layout(timed), [timed]);
  const isDone = (h, iso = date) => logSet.has(logKey(h.id, iso));
  const ctxFor = (h) => ({ date, exception: exMap.get(logKey(h.id, date)) });

  // ----- kéo thả bằng tay cầm bên trái -----
  function dragStart(e, h) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: h.id, y: e.clientY, s: minutesOf(h.start_time), e: h.end_time ? minutesOf(h.end_time) : null, h };
    setDrag({ id: h.id, delta: 0 });
  }
  function dragMove(e) {
    const r = dragRef.current;
    if (!r) return;
    let delta = Math.round((e.clientY - r.y) / PX / SNAP) * SNAP;
    const hi = (r.e ?? r.s + 15) ; // không kéo ra ngoài 00:00–23:59
    delta = Math.max(-r.s, Math.min(1439 - hi, delta));
    setDrag({ id: r.id, delta });
  }
  function dragEnd() {
    const r = dragRef.current;
    dragRef.current = null;
    const delta = drag?.delta || 0;
    setDrag(null);
    if (!r || !delta) return;
    const start_time = hhmm(r.s + delta);
    const end_time = r.e !== null ? hhmm(r.e + delta) : null;
    if (r.h.once_on) {
      api.updateHabit(r.h.id, habitBody(r.h, { start_time, end_time })).then(() => { flash('Đã dời giờ'); reload(); }).catch((er) => flash(er.message));
    } else {
      setMove({ h: r.h, start_time, end_time });
    }
  }
  async function applyMove(scope) {
    const { h, start_time, end_time } = move;
    setMove(null);
    try {
      if (scope === 'day') await api.setException({ habit_id: h.id, date, start_time, end_time });
      else await api.updateHabit(h.id, habitBody(h, { start_time, end_time }));
      flash(scope === 'day' ? 'Đã dời giờ cho riêng ngày này' : 'Đã dời giờ cho mọi ngày');
      reload();
    } catch (er) { flash(er.message); }
  }

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const hours = Array.from({ length: LAST_H - FIRST_H }, (_, i) => FIRST_H + i);

  // ----- chế độ tuần -----
  const ws = startOfWeek(d);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

  const nav = (n) => setDate(toISO(addDays(d, mode === 'week' ? n * 7 : n)));

  return (
    <div className="page">
      <PageHead title="Lịch" right={<button className="chip on" onClick={() => setTplOpen(true)}>📋 Lịch mẫu</button>} />
      <Seg value={mode} onChange={setMode} options={[['day', 'Ngày'], ['week', 'Tuần']]} />

      <div className="nav">
        <button aria-label="Trước" onClick={() => nav(-1)}>‹</button>
        <div>{mode === 'week' ? `${WD_SHORT[0]} ${weekDays[0].getDate()}/${weekDays[0].getMonth() + 1} – CN ${weekDays[6].getDate()}/${weekDays[6].getMonth() + 1}` : dayTitle(date)}</div>
        <button aria-label="Sau" onClick={() => nav(1)}>›</button>
      </div>
      {(mode === 'week' ? toISO(ws) !== toISO(startOfWeek(new Date())) : date !== today) && (
        <button className="link-light" onClick={() => setDate(today)}>Về hôm nay</button>
      )}

      {!loaded ? <Loading /> : mode === 'week' ? (
        <div className="weekgrid">
          {weekDays.map((wd, i) => {
            const iso = toISO(wd);
            const list = itemsOn(habits, exMap, wd).sort(byTime);
            const ok = list.filter((h) => isDone(h, iso)).length;
            return (
              <div className={'card wcard' + (iso === today ? ' today' : '')} key={iso}>
                <button className="whead" onClick={() => { setDate(iso); setMode('day'); }}>
                  <b>{WD_SHORT[i]} {wd.getDate()}/{wd.getMonth() + 1}</b>
                  <span>{list.length ? `${ok}/${list.length}` : 'Trống'}</span>
                </button>
                {list.slice(0, 8).map((h) => (
                  <div className={'wrow' + (isDone(h, iso) ? ' done' : '')} key={h.id} style={{ borderLeftColor: catOf(h.category).color }}>
                    <small>{h.start_time || '·'}</small>
                    <span>{h.title}</span>
                  </div>
                ))}
                {list.length > 8 && <div className="wmore">+{list.length - 8} việc nữa</div>}
              </div>
            );
          })}
        </div>
      ) : !all.length ? (
        <Empty icon="🗓️" text={habits.length ? 'Ngày này chưa có việc nào.' : 'Chưa có lịch. Thêm việc đầu tiên, hoặc nạp lịch mẫu của bạn.'} action={habits.length ? '+ Thêm vào lịch' : '📋 Mở lịch mẫu'} onAction={habits.length ? () => onAdd({ date, once: true }) : () => setTplOpen(true)} />
      ) : (
        <>
          {untimed.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              {untimed.map((h) => (
                <div key={h.id} className={'item' + (isDone(h) ? ' done' : '')}>
                  <button className={'check' + (isDone(h) ? ' on' : '')} disabled={isFuture} onClick={() => onToggle(h.id, date, !isDone(h))}>{isDone(h) ? '✓' : ''}</button>
                  <button className="grow body" onClick={() => onEdit(h, ctxFor(h))}><div className="t">{h.title}</div><div className="s">Cả ngày</div></button>
                  <div className="ico" style={{ background: catOf(h.category).color + '26' }}>{catOf(h.category).icon}</div>
                </div>
              ))}
            </div>
          )}

          {placed.length > 0 && (
            <div className="timeline card" style={{ height: HEIGHT + 24 }}>
              {hours.map((h) => (
                <div className="hour" key={h} style={{ top: (h - FIRST_H) * 60 * PX + 12 }}><span>{String(h).padStart(2, '0')}:00</span></div>
              ))}
              {date === today && nowMin >= FIRST_H * 60 && nowMin < LAST_H * 60 && (
                <div className="nowline" style={{ top: (nowMin - FIRST_H * 60) * PX + 12 }}><i /></div>
              )}
              <div className="lane-area">
                {placed.map((h) => {
                  const c = catOf(h.category);
                  const delta = drag?.id === h.id ? drag.delta : 0;
                  const top = (Math.max(h._s + delta, FIRST_H * 60) - FIRST_H * 60) * PX + 12;
                  const height = Math.max((h._e - h._s) * PX, 26);
                  const done = isDone(h);
                  return (
                    <div
                      key={h.id}
                      className={'block' + (done ? ' done' : '') + (drag?.id === h.id ? ' dragging' : '')}
                      style={{ top, height, left: `${(h._lane / h._lanes) * 100}%`, width: `calc(${100 / h._lanes}% - 4px)`, background: c.color + '2e', borderLeftColor: c.color }}
                    >
                      <span className="grip" onPointerDown={(e) => dragStart(e, h)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd} aria-label="Kéo để dời giờ">⋮⋮</span>
                      <button className="bbody" onClick={() => onEdit(h, ctxFor(h))}>
                        <b>{h.title}</b>
                        {height >= 40 && <small>{drag?.id === h.id ? `${hhmm(h._s + delta)}${h.end_time ? ' – ' + hhmm(h._e + delta) : ''}` : timeLabel(h)}{h.moved ? ' · dời' : ''}</small>}
                      </button>
                      <button className={'check sm' + (done ? ' on' : '')} disabled={isFuture} aria-label="Hoàn thành" onClick={() => onToggle(h.id, date, !done)}>{done ? '✓' : ''}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {checks.length > 0 && (
            <>
              <div className="section-title">Thói quen trong ngày</div>
              <div className="chips-wrap">
                {checks.map((h) => (
                  <button key={h.id} disabled={isFuture} className={'hchip' + (isDone(h) ? ' on' : '')} onClick={() => onToggle(h.id, date, !isDone(h))}>
                    {isDone(h) ? '✓ ' : ''}{h.title}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="hint light" style={{ textAlign: 'center', marginTop: 12 }}>Kéo tay cầm ⋮⋮ để dời giờ · bấm vào khối để sửa, bỏ qua hoặc dời giờ riêng ngày này</div>
        </>
      )}

      {move && (
        <Sheet title={`Dời "${move.h.title}" sang ${move.start_time}${move.end_time ? ' – ' + move.end_time : ''}`} onClose={() => setMove(null)}>
          <p className="hint">Việc này lặp lại hằng tuần. Bạn muốn áp dụng thay đổi thế nào?</p>
          <button className="btn" onClick={() => applyMove('day')}>Chỉ {dayTitle(date).toLowerCase()}</button>
          <div className="btn-row">
            <button className="btn ghost" onClick={() => applyMove('all')}>Mọi ngày lặp lại</button>
            <button className="btn ghost" onClick={() => setMove(null)}>Hủy</button>
          </div>
        </Sheet>
      )}
      {tplOpen && (
        <TemplateSheet date={date} dayItems={timed} habitCount={habits.length} onClose={() => setTplOpen(false)}
          onDone={(m) => { setTplOpen(false); flash(m); reload(); }} />
      )}
    </div>
  );
}

function TemplateSheet({ date, dayItems, habitCount, onClose, onDone }) {
  const { data: tpls, reload } = useLoad(() => api.get('/api/templates'), []);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg) => {
    setBusy(true); setErr('');
    try { await fn(); msg ? onDone(msg) : reload(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const apply = (t) => run(() => api.bulkHabits(t.items.map((i) => ({ ...i, kind: 'block', once_on: date, days: 127 }))), `Đã áp dụng "${t.name}" cho ngày này`);
  const saveToday = () => {
    if (!name.trim()) return setErr('Đặt tên cho lịch mẫu');
    if (!dayItems.length) return setErr('Ngày này chưa có việc có giờ để lưu');
    const items = dayItems.map((h) => ({ title: h.title, category: h.category, start_time: h.start_time, end_time: h.end_time, remind_before: h.remind_before, note: h.note }));
    run(async () => { await api.post('/api/templates', { name: name.trim(), items }); setName(''); }, null);
  };
  const seed = () => {
    if (habitCount && !confirm('Thêm lịch sinh hoạt mẫu vào lịch hiện tại? Các việc đang có vẫn được giữ.')) return;
    run(() => api.bulkHabits([...SAMPLE_ROUTINE, ...SAMPLE_HABITS].map((h) => ({ ...h, start_date: todayISO() }))), 'Đã nạp lịch sinh hoạt mẫu, bạn có thể sửa từng mục');
  };
  return (
    <Sheet title="Lịch mẫu" onClose={onClose}>
      {err && <div className="err">{err}</div>}
      <button className="btn" disabled={busy} onClick={seed}>✨ Nạp lịch sinh hoạt mẫu của tôi</button>
      <div className="hint">Gồm lịch từ 07:30 đến 23:30 (gym T2–T6, đá banh T7) và 11 thói quen hằng ngày.</div>

      <div className="section-title dark">Lịch mẫu đã lưu</div>
      {!tpls ? <Loading /> : !tpls.length ? <div className="hint">Chưa có. Lưu lịch của ngày đang xem ở bên dưới để dùng lại cho ngày khác.</div> : (
        <div className="card flat">
          {tpls.map((t) => (
            <div className="item" key={t.id}>
              <div className="grow"><div className="t">{t.name}</div><div className="s">{t.items.length} việc</div></div>
              <button className="chip on" disabled={busy} onClick={() => apply(t)}>Áp dụng</button>
              <button className="chip" disabled={busy} onClick={() => confirm(`Xóa lịch mẫu "${t.name}"?`) && run(() => api.del(`/api/templates/${t.id}`), null)}>Xóa</button>
            </div>
          ))}
        </div>
      )}
      <div className="field" style={{ marginTop: 14 }}>
        <label>Lưu lịch ngày đang xem ({dayItems.length} việc có giờ) thành mẫu</label>
        <div className="manual">
          <input className="input" placeholder="VD: Ngày gym, Ngày nghỉ…" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <button className="btn ghost" disabled={busy} onClick={saveToday}>Lưu</button>
        </div>
      </div>
      <div className="btn-row"><button className="btn ghost" onClick={onClose}>Đóng</button></div>
    </Sheet>
  );
}
