import React, { useState } from 'react';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { Empty, Field, Loading, PageHead, Pomodoro, Seg, Sheet, WORK_KINDS } from './ui.jsx';
import { addDays, fmtHours, fmtVND, fromISO, kindLabel, startOfMonth, startOfWeek, sum, toISO, todayISO } from '../utils.js';

const PRIO = { 3: ['Cao', '#ff4d6d'], 2: ['Vừa', '#ffb020'], 1: ['Thấp', '#37d6a8'] };
const STATUS = [['todo', 'Cần làm'], ['doing', 'Đang làm'], ['done', 'Xong']];
const ymd = (iso) => { const d = fromISO(iso); return `${d.getDate()}/${d.getMonth() + 1}`; };

export default function Work({ onBack }) {
  const [tab, setTab] = useState('tasks');
  const { data: projects, reload: reloadP } = useLoad(() => api.get('/api/projects'), []);
  return (
    <div className="page">
      <PageHead title="Công việc" onBack={onBack} />
      <Seg value={tab} onChange={setTab} options={[['tasks', '✅ Việc'], ['projects', '📁 Dự án'], ['money', '💰 Thu nhập']]} />
      {!projects ? <Loading /> : (
        <>
          {tab === 'tasks' && <Tasks projects={projects} />}
          {tab === 'projects' && <Projects projects={projects} reload={reloadP} />}
          {tab === 'money' && <Money projects={projects} />}
        </>
      )}
    </div>
  );
}

// ---------------- Việc cần làm ----------------
function Tasks({ projects }) {
  const { data: tasks, reload, err } = useLoad(() => api.get('/api/tasks'), []);
  const [status, setStatus] = useState('todo');
  const [sheet, setSheet] = useState(null);
  const today = todayISO();
  if (err) return <div className="err">{err}</div>;
  if (!tasks) return <Loading />;
  const pname = (id) => projects.find((p) => p.id === id)?.name;
  const shown = tasks.filter((t) => t.status === status);
  const count = (s) => tasks.filter((t) => t.status === s).length;

  const move = async (t, to) => {
    await api.put(`/api/tasks/${t.id}`, { status: to, done_on: to === 'done' ? today : null });
    reload();
  };
  return (
    <>
      <div className="seg">
        {STATUS.map(([k, l]) => <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l} {count(k) ? `(${count(k)})` : ''}</button>)}
      </div>
      <button className="btn" onClick={() => setSheet({ status })}>+ Thêm việc</button>
      <div style={{ marginTop: 14 }}>
        {!shown.length ? <Empty icon={status === 'done' ? '🏁' : '📭'} text={status === 'done' ? 'Chưa có việc nào hoàn thành.' : 'Không có việc nào ở đây.'} /> : (
          <div className="card">
            {shown.map((t) => {
              const overdue = t.due_on && t.due_on < today && t.status !== 'done';
              return (
                <div className={'item' + (t.status === 'done' ? ' done' : '')} key={t.id}>
                  <span className="prio" style={{ background: PRIO[t.priority]?.[1] }} title={`Ưu tiên ${PRIO[t.priority]?.[0]}`} />
                  <button className="grow body" onClick={() => setSheet(t)}>
                    <div className="t">{t.title}</div>
                    <div className="s">
                      {pname(t.project_id) && <>📁 {pname(t.project_id)} · </>}
                      {t.due_on ? <span className={overdue ? 'late' : ''}>Hạn {ymd(t.due_on)}{overdue ? ' (trễ)' : ''}</span> : 'Không hạn'}
                    </div>
                  </button>
                  {t.status !== 'done' && (
                    <button className="chip on" onClick={() => move(t, t.status === 'todo' ? 'doing' : 'done')}>{t.status === 'todo' ? 'Bắt đầu' : 'Xong ✓'}</button>
                  )}
                  {t.status === 'done' && <button className="chip" onClick={() => move(t, 'todo')}>Mở lại</button>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {sheet && <TaskSheet initial={sheet} projects={projects} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); reload(); }} />}
    </>
  );
}

function TaskSheet({ initial, projects, onClose, onSaved }) {
  const editing = !!initial.id;
  const [f, setF] = useState({
    title: initial.title || '', project_id: initial.project_id || '', priority: initial.priority || 2,
    due_on: initial.due_on || '', status: initial.status || 'todo', note: initial.note || '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    if (!f.title.trim()) return setErr('Nhập tên việc');
    setBusy(true); setErr('');
    const body = {
      title: f.title, project_id: f.project_id ? Number(f.project_id) : null, priority: Number(f.priority),
      due_on: f.due_on || null, status: f.status, note: f.note || null,
      done_on: f.status === 'done' ? initial.done_on || todayISO() : null,
    };
    try { if (editing) await api.put(`/api/tasks/${initial.id}`, body); else await api.post('/api/tasks', body); onSaved(); }
    catch (e2) { setErr(e2.message); setBusy(false); }
  }
  async function del() {
    if (!confirm('Xóa việc này?')) return;
    try { await api.del(`/api/tasks/${initial.id}`); onSaved(); } catch (e2) { setErr(e2.message); }
  }
  return (
    <Sheet title={editing ? 'Sửa việc' : 'Thêm việc'} onClose={onClose} onSubmit={save}>
      {err && <div className="err">{err}</div>}
      <Field label="Việc cần làm"><input className="input" value={f.title} maxLength={120} onChange={set('title')} autoFocus={!editing} placeholder="VD: Viết API thanh toán" /></Field>
      <div className="field two">
        <div><label>Dự án</label>
          <select className="input" value={f.project_id} onChange={set('project_id')}>
            <option value="">Không có</option>
            {projects.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><label>Hạn chót</label><input className="input" type="date" value={f.due_on} onChange={set('due_on')} /></div>
      </div>
      <div className="field two">
        <div><label>Ưu tiên</label>
          <select className="input" value={f.priority} onChange={set('priority')}>{[3, 2, 1].map((p) => <option key={p} value={p}>{PRIO[p][0]}</option>)}</select>
        </div>
        <div><label>Trạng thái</label>
          <select className="input" value={f.status} onChange={set('status')}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
      </div>
      <Field label="Ghi chú"><input className="input" value={f.note} maxLength={500} onChange={set('note')} placeholder="Yêu cầu của khách, link tài liệu…" /></Field>
      <button className="btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      <div className="btn-row">
        {editing && <button type="button" className="btn danger" onClick={del}>Xóa</button>}
        <button type="button" className="btn ghost" onClick={onClose}>Hủy</button>
      </div>
    </Sheet>
  );
}

// ---------------- Dự án & giờ làm ----------------
function Projects({ projects, reload }) {
  const ws = startOfWeek(new Date());
  const { data: logs, reload: reloadLogs } = useLoad(() => api.get('/api/time-logs', { from: toISO(addDays(new Date(), -90)), to: toISO(addDays(new Date(), 1)) }), []);
  const [sheet, setSheet] = useState(null);
  const work = (logs || []).filter((l) => !l.kind.startsWith('toeic'));
  const weekMin = sum(work.filter((l) => l.logged_on >= toISO(ws)), (l) => l.minutes);
  const byProject = (id) => sum(work.filter((l) => l.project_id === id), (l) => l.minutes);
  const kinds = [...new Set(work.filter((l) => l.logged_on >= toISO(ws)).map((l) => l.kind))];

  return (
    <>
      <div className="section-title" style={{ marginTop: 4 }}>Bấm giờ làm việc <span>tuần này {fmtHours(weekMin)}</span></div>
      <Pomodoro kinds={WORK_KINDS} defaultKind="freelance" projects={projects.filter((p) => p.status === 'active')} onLogged={reloadLogs} />
      {kinds.length > 0 && <div className="hint light" style={{ textAlign: 'center' }}>{kinds.map((k) => `${kindLabel(k)} ${fmtHours(sum(work.filter((l) => l.kind === k && l.logged_on >= toISO(ws)), (l) => l.minutes))}`).join(' · ')}</div>}

      <div className="section-title">Dự án <button className="more" onClick={() => setSheet({})}>+ Thêm</button></div>
      {!projects.length ? <Empty icon="📁" text="Thêm dự án freelancer hoặc project cá nhân (Backend / AI)." action="+ Thêm dự án" onAction={() => setSheet({})} /> : (
        <div className="card">
          {projects.map((p) => (
            <button className={'item' + (p.status === 'done' ? ' done' : '')} key={p.id} onClick={() => setSheet(p)}>
              <div className="ico" style={{ background: p.kind === 'personal' ? '#6d4aff26' : '#3fa9f526' }}>{p.kind === 'personal' ? '💻' : '💼'}</div>
              <div className="grow">
                <div className="t">{p.name}</div>
                <div className="s">{p.kind === 'personal' ? 'Project cá nhân' : p.client ? `Khách: ${p.client}` : 'Freelancer'} · {fmtHours(byProject(p.id))} (90 ngày){p.status === 'done' ? ' · đã xong' : ''}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="hint light" style={{ textAlign: 'center', marginTop: 10 }}>Theo dõi GitHub / portfolio chưa có trong phiên bản này.</div>
      {sheet && <ProjectSheet initial={sheet} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); reload(); }} />}
    </>
  );
}

function ProjectSheet({ initial, onClose, onSaved }) {
  const editing = !!initial.id;
  const [f, setF] = useState({ name: initial.name || '', client: initial.client || '', kind: initial.kind || 'freelance', status: initial.status || 'active', note: initial.note || '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Nhập tên dự án');
    try { if (editing) await api.put(`/api/projects/${initial.id}`, f); else await api.post('/api/projects', f); onSaved(); } catch (e2) { setErr(e2.message); }
  }
  async function del() {
    if (!confirm('Xóa dự án? Các việc thuộc dự án vẫn được giữ lại.')) return;
    try { await api.del(`/api/projects/${initial.id}`); onSaved(); } catch (e2) { setErr(e2.message); }
  }
  return (
    <Sheet title={editing ? 'Sửa dự án' : 'Thêm dự án'} onClose={onClose} onSubmit={save}>
      {err && <div className="err">{err}</div>}
      <Field label="Tên dự án"><input className="input" value={f.name} maxLength={80} onChange={set('name')} autoFocus={!editing} /></Field>
      <div className="field two">
        <div><label>Loại</label><select className="input" value={f.kind} onChange={set('kind')}><option value="freelance">Freelancer</option><option value="personal">Cá nhân (Backend / AI)</option></select></div>
        <div><label>Trạng thái</label><select className="input" value={f.status} onChange={set('status')}><option value="active">Đang làm</option><option value="done">Đã xong</option></select></div>
      </div>
      {f.kind === 'freelance' && <Field label="Khách hàng"><input className="input" value={f.client} maxLength={80} onChange={set('client')} /></Field>}
      <Field label="Ghi chú"><input className="input" value={f.note} maxLength={500} onChange={set('note')} /></Field>
      <button className="btn">Lưu</button>
      <div className="btn-row">
        {editing && <button type="button" className="btn danger" onClick={del}>Xóa</button>}
        <button type="button" className="btn ghost" onClick={onClose}>Hủy</button>
      </div>
    </Sheet>
  );
}

// ---------------- Thu nhập ----------------
function Money({ projects }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const from = toISO(month), to = toISO(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const { data: rows, reload, err } = useLoad(() => api.get('/api/income', { from, to }), [from]);
  const [f, setF] = useState({ amount: '', received_on: todayISO(), project_id: '', note: '' });
  const [msg, setMsg] = useState('');
  if (err) return <div className="err">{err}</div>;
  const total = sum(rows || [], (r) => r.amount);
  const pname = (id) => projects.find((p) => p.id === id)?.name;

  async function add(e) {
    e.preventDefault();
    const amount = Number(String(f.amount).replace(/\D/g, ''));
    if (!amount) return setMsg('Nhập số tiền');
    try { await api.post('/api/income', { amount, received_on: f.received_on, project_id: f.project_id ? Number(f.project_id) : null, note: f.note || null }); setF({ ...f, amount: '', note: '' }); setMsg(''); reload(); }
    catch (e2) { setMsg(e2.message); }
  }
  return (
    <>
      <div className="nav">
        <button aria-label="Tháng trước" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
        <div>Tháng {month.getMonth() + 1}/{month.getFullYear()}</div>
        <button aria-label="Tháng sau" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="card pad"><div className="total-box"><small>Thu nhập freelancer</small><div className="big in">{fmtVND(total)}</div></div></div>
      <div className="section-title">Ghi khoản thu</div>
      <form className="card pad" onSubmit={add}>
        {msg && <div className="err">{msg}</div>}
        <div className="field two">
          <div><label>Số tiền (đ)</label><input className="input" inputMode="numeric" value={f.amount ? new Intl.NumberFormat('vi-VN').format(Number(String(f.amount).replace(/\D/g, ''))) : ''} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
          <div><label>Ngày nhận</label><input className="input" type="date" value={f.received_on} onChange={(e) => setF({ ...f, received_on: e.target.value })} /></div>
        </div>
        <div className="field two">
          <div><label>Dự án</label><select className="input" value={f.project_id} onChange={(e) => setF({ ...f, project_id: e.target.value })}><option value="">Không gắn</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label>Ghi chú</label><input className="input" value={f.note} maxLength={200} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <button className="btn">Lưu khoản thu</button>
      </form>
      {rows && rows.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          {rows.map((r) => (
            <div className="item" key={r.id}>
              <div className="grow"><div className="t">{pname(r.project_id) || r.note || 'Khoản thu'}</div><div className="s">{ymd(r.received_on)}{r.note && pname(r.project_id) ? ` · ${r.note}` : ''}</div></div>
              <b className="amt in">+{fmtVND(r.amount)}</b>
              <button className="mini-edit" aria-label="Xóa" onClick={async () => { if (confirm('Xóa khoản thu này?')) { await api.del(`/api/income/${r.id}`); reload(); } }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
