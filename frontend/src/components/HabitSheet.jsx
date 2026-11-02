import React, { useState } from 'react';
import { api } from '../api.js';
import { ALL_DAYS, CATEGORIES, PRESETS, REMIND_OPTIONS, WD_SHORT, catOf } from '../utils.js';

export default function HabitSheet({ initial, onClose, onSaved }) {
  const editing = !!initial?.id;
  const [title, setTitle] = useState(initial?.title || '');
  const [category, setCategory] = useState(initial?.category || 'work');
  const [start, setStart] = useState(initial?.start_time || '');
  const [end, setEnd] = useState(initial?.end_time || '');
  const [days, setDays] = useState(initial?.days || ALL_DAYS);
  const [remind, setRemind] = useState(initial?.remind_before ?? '');
  const [note, setNote] = useState(initial?.note || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleDay = (i) => setDays((d) => d ^ (1 << i));
  const applyPreset = (p) => {
    setTitle(p.title); setCategory(p.category); setStart(p.start); setEnd(p.end);
    if (!p.start) setRemind('');
  };
  const onStart = (v) => { setStart(v); if (!v) { setEnd(''); setRemind(''); } };

  async function save(e) {
    e.preventDefault();
    setErr('');
    if (!title.trim()) return setErr('Nhập tên hoạt động');
    if (!days) return setErr('Chọn ít nhất một ngày trong tuần');
    if (end && start && end <= start) return setErr('Giờ kết thúc phải sau giờ bắt đầu');
    setBusy(true);
    try {
      const body = {
        title: title.trim(), category, days,
        start_time: start || null, end_time: end || null,
        remind_before: remind === '' || !start ? null : Number(remind),
        note: note.trim() || null,
      };
      if (editing) await api.updateHabit(initial.id, body);
      else await api.createHabit(body);
      onSaved(editing ? 'Đã cập nhật' : 'Đã thêm vào lịch');
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm(`Xóa "${initial.title}"? Lịch sử hoàn thành của hoạt động này cũng bị xóa.`)) return;
    setBusy(true);
    try {
      await api.removeHabit(initial.id);
      onSaved('Đã xóa');
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="grab" />
        <h3>{editing ? 'Sửa hoạt động' : 'Thêm vào lịch'}</h3>
        {err && <div className="err">{err}</div>}

        {!editing && (
          <div className="quick" style={{ marginTop: 0, marginBottom: 14 }}>
            {PRESETS.map((p) => (
              <button type="button" key={p.title} onClick={() => applyPreset(p)}>{catOf(p.category).icon} {p.title}</button>
            ))}
          </div>
        )}

        <div className="field">
          <label>Làm gì?</label>
          <input className="input" placeholder="VD: Tập ngực + tay, ôn tiếng Anh…" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} autoFocus={!editing} />
        </div>

        <div className="field">
          <label>Loại</label>
          <div className="cats">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} className={'cat' + (category === c.id ? ' on' : '')} onClick={() => setCategory(c.id)}>
                <span>{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Lặp lại vào</label>
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

        <div className="field">
          <label>Nhắc nhở</label>
          <select className="input" value={remind} disabled={!start} onChange={(e) => setRemind(e.target.value)}>
            {REMIND_OPTIONS.map((o) => <option key={String(o.v)} value={o.v}>{o.label}</option>)}
          </select>
          {!start && <div className="hint">Đặt giờ bắt đầu để bật nhắc nhở</div>}
        </div>

        <div className="field">
          <label>Ghi chú (không bắt buộc)</label>
          <input className="input" placeholder="VD: mang giày, bài tập chương 3…" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        </div>

        <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm vào lịch'}</button>
        <div className="btn-row">
          {editing && <button type="button" className="btn danger" onClick={del} disabled={busy}>Xóa</button>}
          <button type="button" className="btn ghost" onClick={onClose}>Hủy</button>
        </div>
      </form>
    </div>
  );
}
