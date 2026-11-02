import React, { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { LineChart, Meter } from './charts.jsx';
import { Empty, Field, Loading, PageHead, Pomodoro, Seg, Sheet, TOEIC_KINDS } from './ui.jsx';
import { addDays, fmtHours, fromISO, itemsOn, kindLabel, minutesOf, startOfWeek, sum, toISO, todayISO, withDefaults } from '../utils.js';

const ymd = (iso) => { const d = fromISO(iso); return `${d.getDate()}/${d.getMonth() + 1}`; };
const INTERVALS = [1, 2, 4, 7, 14, 30, 60];

export default function Toeic({ D, onBack, onSettings }) {
  const [tab, setTab] = useState('plan');
  const goal = withDefaults(D.settings);
  return (
    <div className="page">
      <PageHead title="TOEIC" onBack={onBack} right={<button className="chip" onClick={onSettings}>🎯 Mục tiêu</button>} />
      <Seg value={tab} onChange={setTab} options={[['plan', '📘 Học'], ['vocab', '🔤 Từ vựng'], ['mock', '📝 Mock test']]} />
      {tab === 'plan' && <Plan D={D} goal={goal} />}
      {tab === 'vocab' && <Vocab />}
      {tab === 'mock' && <Mock goal={goal} />}
    </div>
  );
}

function Plan({ D, goal }) {
  const ws = startOfWeek(new Date());
  const from = toISO(ws), to = toISO(addDays(ws, 6));
  const { data: logs, reload } = useLoad(() => api.get('/api/time-logs', { from, to }), [from]);
  const { data: tests } = useLoad(() => api.get('/api/mock-tests'), []);
  const today = todayISO();
  const toeic = (logs || []).filter((l) => l.kind.startsWith('toeic'));
  const byKind = (k) => sum(toeic.filter((l) => l.kind === k), (l) => l.minutes);
  const todayMin = sum(toeic.filter((l) => l.logged_on === today), (l) => l.minutes);
  const weekMin = sum(toeic, (l) => l.minutes);

  // Kế hoạch tuần theo lịch (khung giờ loại TOEIC)
  const planned = useMemo(() => {
    let m = 0;
    for (let i = 0; i < 7; i++) {
      itemsOn(D.habits, D.exMap, addDays(ws, i)).forEach((h) => {
        if (h.category === 'toeic' && h.start_time && h.end_time) m += minutesOf(h.end_time) - minutesOf(h.start_time);
      });
    }
    return m;
  }, [D.habits, D.exMap, from]); // eslint-disable-line react-hooks/exhaustive-deps

  const latest = tests?.[0];
  const total = latest ? latest.listening + latest.reading : null;
  const exam = goal.toeic_exam ? Math.ceil((fromISO(goal.toeic_exam) - fromISO(today)) / 86400000) : null;

  return (
    <>
      <div className="card pad">
        <Meter label={total !== null ? `Điểm mock gần nhất: ${total}` : 'Chưa có mock test'} value={total || 0} goal={goal.toeic_target} color="#8b7bff" />
        <div className="hint">Mục tiêu {goal.toeic_target} điểm{exam !== null ? (exam >= 0 ? ` · còn ${exam} ngày đến kỳ thi` : ' · kỳ thi đã qua') : ' · đặt ngày thi trong 🎯 Mục tiêu để đếm ngược'}</div>
      </div>

      <div className="section-title">Bấm giờ học</div>
      <Pomodoro kinds={TOEIC_KINDS} defaultKind="toeic_vocab" onLogged={reload} />

      <div className="section-title">Tuần này <span>{fmtHours(weekMin)}{planned ? ` / kế hoạch ${fmtHours(planned)}` : ''}</span></div>
      <div className="card pad">
        {!logs ? <Loading /> : (
          <>
            <Meter label="Hôm nay" value={todayMin} goal={planned ? planned / 7 : 60} unit=" phút" color="#8b7bff" />
            {TOEIC_KINDS.map((k) => <Meter key={k.id} label={kindLabel(k.id)} value={byKind(k.id)} goal={planned ? Math.max(planned / 4, 1) : 0} unit=" phút" color="#b07bff" />)}
          </>
        )}
      </div>
      {logs && toeic.length > 0 && (
        <div className="card flat" style={{ marginTop: 12 }}>
          {toeic.slice(0, 6).map((l) => (
            <div className="item" key={l.id}>
              <div className="grow"><div className="t">{kindLabel(l.kind)}</div><div className="s">{ymd(l.logged_on)}</div></div>
              <b className="amt">{l.minutes} phút</b>
              <button className="mini-edit" aria-label="Xóa" onClick={async () => { await api.del(`/api/time-logs/${l.id}`); reload(); }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Vocab() {
  const { data: words, reload, err } = useLoad(() => api.get('/api/vocab'), []);
  const [f, setF] = useState({ word: '', meaning: '', example: '' });
  const [msg, setMsg] = useState('');
  const [review, setReview] = useState(false);
  const today = todayISO();
  if (err) return <div className="err">{err}</div>;
  if (!words) return <Loading />;
  const due = words.filter((w) => w.next_review <= today);

  async function add(e) {
    e.preventDefault();
    if (!f.word.trim() || !f.meaning.trim()) return setMsg('Nhập từ và nghĩa');
    try { await api.post('/api/vocab', { word: f.word, meaning: f.meaning, example: f.example }); setF({ word: '', meaning: '', example: '' }); setMsg(''); reload(); }
    catch (e2) { setMsg(e2.message); }
  }
  return (
    <>
      <div className="card pad">
        <div className="total-box"><div className="big">{due.length}</div><small>từ cần ôn hôm nay · tổng {words.length} từ</small></div>
        <button className="btn" disabled={!due.length} onClick={() => setReview(true)}>{due.length ? 'Bắt đầu ôn tập' : 'Hôm nay đã ôn xong 🎉'}</button>
      </div>
      <div className="section-title">Thêm từ mới</div>
      <form className="card pad" onSubmit={add}>
        {msg && <div className="err">{msg}</div>}
        <div className="field two">
          <div><label>Từ</label><input className="input" value={f.word} maxLength={80} onChange={(e) => setF({ ...f, word: e.target.value })} autoCapitalize="none" /></div>
          <div><label>Nghĩa</label><input className="input" value={f.meaning} maxLength={200} onChange={(e) => setF({ ...f, meaning: e.target.value })} /></div>
        </div>
        <Field label="Ví dụ (không bắt buộc)"><input className="input" value={f.example} maxLength={300} onChange={(e) => setF({ ...f, example: e.target.value })} /></Field>
        <button className="btn">Thêm từ</button>
      </form>
      {words.length > 0 && (
        <>
          <div className="section-title">Danh sách từ</div>
          <div className="card">
            {words.slice(0, 40).map((w) => (
              <div className="item" key={w.id}>
                <div className="grow"><div className="t">{w.word}</div><div className="s">{w.meaning} · hộp {w.box + 1}/7 · ôn {w.next_review <= today ? 'hôm nay' : ymd(w.next_review)}</div></div>
                <button className="mini-edit" aria-label="Xóa" onClick={async () => { await api.del(`/api/vocab/${w.id}`); reload(); }}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}
      {review && <Review words={due} onClose={() => { setReview(false); reload(); }} />}
    </>
  );
}

function Review({ words, onClose }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const w = words[i];
  async function rate(ok) {
    setBusy(true);
    const box = ok ? Math.min(w.box + 1, 6) : 0;
    try { await api.put(`/api/vocab/${w.id}`, { box, next_review: toISO(addDays(new Date(), INTERVALS[box])) }); } catch { /* bỏ qua */ }
    setBusy(false); setShow(false); setI((x) => x + 1);
  }
  return (
    <Sheet title={w ? `Ôn tập ${i + 1}/${words.length}` : 'Hoàn thành!'} onClose={onClose}>
      {w ? (
        <>
          <div className="flash" onClick={() => setShow(true)}>
            <b>{w.word}</b>
            {show ? <><p>{w.meaning}</p>{w.example && <small>{w.example}</small>}</> : <small>Chạm để xem nghĩa</small>}
          </div>
          {show ? (
            <div className="btn-row">
              <button className="btn danger" disabled={busy} onClick={() => rate(false)}>Chưa nhớ</button>
              <button className="btn" disabled={busy} onClick={() => rate(true)}>Nhớ rồi</button>
            </div>
          ) : <button className="btn ghost" onClick={() => setShow(true)}>Hiện nghĩa</button>}
        </>
      ) : <><p className="hint">Bạn đã ôn xong {words.length} từ hôm nay. Mai gặp lại!</p><button className="btn" onClick={onClose}>Đóng</button></>}
    </Sheet>
  );
}

function Mock({ goal }) {
  const { data: tests, reload, err } = useLoad(() => api.get('/api/mock-tests'), []);
  const [f, setF] = useState({ taken_on: todayISO(), listening: '', reading: '', note: '' });
  const [msg, setMsg] = useState('');
  if (err) return <div className="err">{err}</div>;
  if (!tests) return <Loading />;
  const pts = [...tests].reverse().map((t) => ({ x: ymd(t.taken_on), y: t.listening + t.reading }));

  async function add(e) {
    e.preventDefault();
    const l = Number(f.listening), r = Number(f.reading);
    if (f.listening === '' || f.reading === '') return setMsg('Nhập điểm Listening và Reading');
    if (l > 495 || r > 495) return setMsg('Mỗi phần tối đa 495 điểm');
    try { await api.post('/api/mock-tests', { taken_on: f.taken_on, listening: l, reading: r, note: f.note }); setF({ ...f, listening: '', reading: '', note: '' }); setMsg(''); reload(); }
    catch (e2) { setMsg(e2.message); }
  }
  return (
    <>
      <div className="card pad">
        <LineChart points={pts} color="#8b7bff" decimals={0} />
        <div className="hint">Mục tiêu {goal.toeic_target} điểm</div>
      </div>
      <div className="section-title">Ghi kết quả mock test</div>
      <form className="card pad" onSubmit={add}>
        {msg && <div className="err">{msg}</div>}
        <div className="grid-fields">
          <div><label>Ngày thi</label><input className="input" type="date" value={f.taken_on} onChange={(e) => setF({ ...f, taken_on: e.target.value })} /></div>
          <div><label>Ghi chú</label><input className="input" value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Đề ETS 2024…" /></div>
          <div><label>Listening (0–495)</label><input className="input" inputMode="numeric" value={f.listening} onChange={(e) => setF({ ...f, listening: e.target.value.replace(/\D/g, '') })} /></div>
          <div><label>Reading (0–495)</label><input className="input" inputMode="numeric" value={f.reading} onChange={(e) => setF({ ...f, reading: e.target.value.replace(/\D/g, '') })} /></div>
        </div>
        <button className="btn">Lưu kết quả</button>
      </form>
      {tests.length === 0 ? <Empty icon="📝" text="Chưa có mock test nào." /> : (
        <div className="card" style={{ marginTop: 14 }}>
          {tests.slice(0, 15).map((t) => (
            <div className="item" key={t.id}>
              <div className="grow"><div className="t">{t.listening + t.reading} điểm</div><div className="s">{ymd(t.taken_on)} · L {t.listening} · R {t.reading}{t.note ? ` · ${t.note}` : ''}</div></div>
              <button className="mini-edit" aria-label="Xóa" onClick={async () => { if (confirm('Xóa kết quả này?')) { await api.del(`/api/mock-tests/${t.id}`); reload(); } }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
