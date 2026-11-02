import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { TIME_KINDS, todayISO } from '../utils.js';

/** Khung sheet trượt từ dưới lên. */
export function Sheet({ title, onClose, children, onSubmit }) {
  const Tag = onSubmit ? 'form' : 'div';
  return (
    <div className="overlay" onClick={onClose}>
      <Tag className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="grab" />
        {title && <h3>{title}</h3>}
        {children}
      </Tag>
    </div>
  );
}

export const Field = ({ label, hint, children }) => (
  <div className="field">
    {label && <label>{label}</label>}
    {children}
    {hint && <div className="hint">{hint}</div>}
  </div>
);

export const Empty = ({ icon = '🌱', text, action, onAction }) => (
  <div className="empty">
    <div className="em">{icon}</div>
    <p>{text}</p>
    {action && <button className="chip on" onClick={onAction}>{action}</button>}
  </div>
);

export const Loading = () => <div className="loading"><span className="spin" /></div>;

export function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

export const PageHead = ({ title, onBack, right }) => (
  <div className="topbar">
    <div>
      {onBack && <button className="backlink" onClick={onBack}>‹ Phát triển</button>}
      <h1 className="title">{title}</h1>
    </div>
    {right}
  </div>
);

// ---------- Pomodoro / bấm giờ: lưu vào localStorage nên không mất khi chuyển tab ----------
const KEY = 'pomodoro';
const readTimer = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

export function Pomodoro({ kinds, projects, defaultKind, onLogged }) {
  const [t, setT] = useState(readTimer);
  const [kind, setKind] = useState(t?.kind || defaultKind || kinds[0].id);
  const [mins, setMins] = useState(t?.minutes || 25);
  const [project, setProject] = useState(t?.project || '');
  const [, tick] = useState(0);
  const [manual, setManual] = useState('');
  const [msg, setMsg] = useState('');
  const logging = useRef(false);

  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const left = t ? Math.max(0, Math.round((t.endAt - Date.now()) / 1000)) : mins * 60;

  async function save(minutes, k, proj) {
    if (minutes < 1) return;
    await api.post('/api/time-logs', { logged_on: todayISO(), minutes, kind: k, project_id: proj ? Number(proj) : null });
    setMsg(`Đã ghi ${minutes} phút`);
    onLogged?.();
  }

  // Hết giờ (kể cả khi đã chuyển sang tab khác rồi quay lại): ghi giờ học một lần duy nhất
  useEffect(() => {
    if (!t || left > 0 || logging.current) return;
    logging.current = true;
    localStorage.removeItem(KEY);
    setT(null);
    save(t.minutes, t.kind, t.project).catch((e) => setMsg(e.message)).finally(() => { logging.current = false; });
    try { navigator.vibrate?.(300); } catch { /* bỏ qua */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, t]);

  function start() {
    const next = { endAt: Date.now() + mins * 60000, minutes: mins, kind, project };
    localStorage.setItem(KEY, JSON.stringify(next));
    setT(next); setMsg('');
  }
  function stop() {
    if (!t) return;
    const doneMin = Math.floor((t.minutes * 60 - left) / 60);
    localStorage.removeItem(KEY);
    setT(null);
    if (doneMin >= 1 && confirm(`Ghi ${doneMin} phút đã học/làm?`)) save(doneMin, t.kind, t.project).catch((e) => setMsg(e.message));
  }
  async function addManual(e) {
    e.preventDefault();
    const m = parseInt(manual, 10);
    if (!m || m < 1 || m > 1440) return setMsg('Nhập số phút hợp lệ');
    try { await save(m, kind, project); setManual(''); } catch (e2) { setMsg(e2.message); }
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className="card pad">
      <div className="pomo-time">{mm}:{ss}</div>
      <div className="quick" style={{ justifyContent: 'center' }}>
        {[15, 25, 45, 60].map((m) => (
          <button key={m} type="button" disabled={!!t} className={mins === m ? 'sel' : ''} onClick={() => setMins(m)}>{m}′</button>
        ))}
      </div>
      <div className="field two" style={{ marginTop: 12 }}>
        <select className="input" value={kind} disabled={!!t} onChange={(e) => setKind(e.target.value)}>
          {kinds.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        {projects ? (
          <select className="input" value={project} disabled={!!t} onChange={(e) => setProject(e.target.value)}>
            <option value="">Không gắn dự án</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : <span />}
      </div>
      {t ? <button className="btn danger" onClick={stop}>Dừng</button> : <button className="btn" onClick={start}>Bắt đầu {mins} phút</button>}
      <form className="manual" onSubmit={addManual}>
        <input className="input" inputMode="numeric" placeholder="Hoặc ghi tay: số phút" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))} />
        <button className="btn ghost">Ghi</button>
      </form>
      {msg && <div className="hint" style={{ textAlign: 'center' }}>{msg}</div>}
    </div>
  );
}

export const TOEIC_KINDS = TIME_KINDS.filter((k) => k.group === 'toeic');
export const WORK_KINDS = TIME_KINDS.filter((k) => k.group !== 'toeic');
