import React, { useState } from 'react';
import { api } from '../api.js';
import {
  ALL_DAYS, CATEGORIES, HABIT_PRESETS, PRESETS, REMIND_OPTIONS, WD_SHORT, catOf, dayTitle, todayISO,
} from '../utils.js';
import { Seg, Sheet } from './ui.jsx';

/**
 * Thêm / sửa một việc. `ctx = { date, exception }` khi mở từ màn Lịch: cho phép sửa riêng ngày đó
 * (dời giờ hoặc bỏ qua) mà không đổi lịch lặp lại.
 */
export default function HabitSheet({ initial, ctx, defaultKind = 'block', onClose, onSaved }) {
  const editing = !!initial?.id;
  const [kind, setKind] = useState(initial?.kind || defaultKind);
  const [title, setTitle] = useState(initial?.title || '');
  const [category, setCategory] = useState(initial?.category || (defaultKind === 'habit' ? 'health' : 'work'));
  const [start, setStart] = useState(initial?.start_time || '');
  const [end, setEnd] = useState(initial?.end_time || '');
  const [days, setDays] = useState(initial?.days || ALL_DAYS);
  const [once, setOnce] = useState(initial?.once_on || (!editing && ctx?.once ? ctx.date : ''));
  const [remind, setRemind] = useState(initial?.remind_before ?? '');
  const [note, setNote] = useState(initial?.note || '');
  const [onlyDay, setOnlyDay] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const isBlock = kind === 'block';
  const recurringHere = editing && isBlock && !initial.once_on && ctx?.date;
  const toggleDay = (i) => setDays((d) => d ^ (1 << i));
  const applyPreset = (p) => { setTitle(p.title); setCategory(p.category); setStart(p.start); setEnd(p.end); };
  const onStart = (v) => { setStart(v); if (!v) { setEnd(''); setRemind(''); } };

  async function run(fn, msg) {
    setBusy(true); setErr('');
    try { await fn(); onSaved(msg); } catch (e) { setErr(e.message); setBusy(false); }
  }

  function save(e) {
    e.preventDefault();
    if (!title.trim()) return setErr('Nhập tên');
    if (isBlock && !once && !days) return setErr('Chọn ít nhất một ngày trong tuần');
    if (isBlock && end && start && end <= start) return setErr('Giờ kết thúc phải sau giờ bắt đầu');
    if (recurringHere && onlyDay) {
      if (!start) return setErr('Cần giờ bắt đầu để dời giờ');
      return run(() => api.setException({ habit_id: initial.id, date: ctx.date, start_time: start, end_time: end || null }), 'Đã dời giờ cho riêng ngày này');
    }
    const body = {
      title: title.trim(), category, kind, days: isBlock && !once ? days : once ? ALL_DAYS : days,
      once_on: isBlock && once ? once : null,
      start_time: isBlock ? start || null : null, end_time: isBlock ? end || null : null,
      remind_before: isBlock && start && remind !== '' ? Number(remind) : null,
      note: note.trim() || null,
    };
    run(() => (editing ? api.updateHabit(initial.id, body) : api.createHabit(body)), editing ? 'Đã cập nhật' : 'Đã thêm');
  }

  const skipDay = () => run(() => api.setException({ habit_id: initial.id, date: ctx.date, skipped: true }), 'Đã bỏ qua việc này hôm nay');
  const resetDay = () => run(() => api.clearException(initial.id, ctx.date), 'Đã trả về lịch gốc');
  const del = () => {
    if (!confirm(`Xóa "${initial.title}"? Lịch sử hoàn thành của mục này cũng bị xóa.`)) return;
    run(() => api.removeHabit(initial.id), 'Đã xóa');
  };

  return (
    <Sheet title={editing ? 'Sửa' : kind === 'habit' ? 'Thêm thói quen' : 'Thêm vào lịch'} onClose={onClose} onSubmit={save}>
      {err && <div className="err">{err}</div>}

      {!editing && (
        <Seg value={kind} onChange={setKind} options={[['block', '🕒 Khung giờ'], ['habit', '✅ Thói quen']]} />
      )}

      <div className="quick" style={{ marginTop: 0, marginBottom: 14 }}>
        {!editing && isBlock && PRESETS.map((p) => (
          <button type="button" key={p.title} onClick={() => applyPreset(p)}>{catOf(p.category).icon} {p.title}</button>
        ))}
        {!editing && !isBlock && HABIT_PRESETS.map((p) => (
          <button type="button" key={p} onClick={() => setTitle(p)}>{p}</button>
        ))}
      </div>

      <div className="field">
        <label>{isBlock ? 'Làm gì?' : 'Thói quen'}</label>
        <input className="input" placeholder={isBlock ? 'VD: Gym ngực + tay, ôn TOEIC…' : 'VD: Uống đủ nước'} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} autoFocus={!editing} />
      </div>

      {isBlock && (
        <div className="field">
          <label>Loại</label>
          <div className="cats">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} className={'cat' + (category === c.id ? ' on' : '')} onClick={() => setCategory(c.id)}>
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isBlock && !recurringHere && (
        <div className="field">
          <label>Lặp lại</label>
          <Seg value={once ? 'once' : 'rep'} onChange={(v) => setOnce(v === 'once' ? (ctx?.date || todayISO()) : '')} options={[['rep', 'Theo tuần'], ['once', 'Chỉ một ngày']]} />
          {once ? (
            <input className="input" type="date" value={once} onChange={(e) => setOnce(e.target.value)} />
          ) : null}
        </div>
      )}
      {(!isBlock || (!once && !recurringHere)) && (
        <div className="field">
          <label>{isBlock ? 'Các ngày trong tuần' : 'Làm vào các ngày'}</label>
          <div className="days">
            {WD_SHORT.map((w, i) => (
              <button type="button" key={w} className={days & (1 << i) ? 'on' : ''} onClick={() => toggleDay(i)}>{w}</button>
            ))}
          </div>
          <div className="quick">
            <button type="button" onClick={() => setDays(ALL_DAYS)}>Hằng ngày</button>
            <button type="button" onClick={() => setDays(31)}>T2 – T6</button>
            <button type="button" onClick={() => setDays(96)}>Cuối tuần</button>
          </div>
        </div>
      )}

      {isBlock && (
        <>
          <div className="field two">
            <div>
              <label>Giờ bắt đầu</label>
              <input className="input" type="time" value={start} onChange={(e) => onStart(e.target.value)} />
            </div>
            <div>
              <label>Giờ kết thúc</label>
              <input className="input" type="time" value={end} disabled={!start} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {recurringHere && (
            <label className="check-line">
              <input type="checkbox" checked={onlyDay} onChange={(e) => setOnlyDay(e.target.checked)} />
              Chỉ đổi giờ cho riêng {dayTitle(ctx.date).toLowerCase()}
            </label>
          )}
          <div className="field">
            <label>Nhắc nhở</label>
            <select className="input" value={remind} disabled={!start} onChange={(e) => setRemind(e.target.value)}>
              {REMIND_OPTIONS.map((o) => <option key={String(o.v)} value={o.v}>{o.label}</option>)}
            </select>
            {!start && <div className="hint">Đặt giờ bắt đầu để bật nhắc nhở</div>}
          </div>
        </>
      )}

      <div className="field">
        <label>Ghi chú (không bắt buộc)</label>
        <input className="input" placeholder="VD: mang giày, bài tập chương 3…" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
      </div>

      <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm'}</button>
      {recurringHere && (
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={skipDay} disabled={busy}>Bỏ qua hôm nay</button>
          {ctx.exception && <button type="button" className="btn ghost" onClick={resetDay} disabled={busy}>Về lịch gốc</button>}
        </div>
      )}
      <div className="btn-row">
        {editing && <button type="button" className="btn danger" onClick={del} disabled={busy}>Xóa hẳn</button>}
        <button type="button" className="btn ghost" onClick={onClose}>Hủy</button>
      </div>
    </Sheet>
  );
}
