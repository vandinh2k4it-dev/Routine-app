import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { Ring } from './charts.jsx';
import { Loading, PageHead } from './ui.jsx';
import {
  addDays, fmtHours, fmtVND, isScheduled, logKey as lk, num1, rangeStats, sleepOnTime, startOfWeek, sum, toISO, weekLabel, withDefaults,
} from '../utils.js';

export default function Review({ D, onBack }) {
  const goal = withDefaults(D.settings);
  const [ws, setWs] = useState(() => startOfWeek(new Date()));
  const from = toISO(ws), to = toISO(addDays(ws, 6));
  const { data: B, err } = useLoad(() => api.bundle(from, to), [from]);
  const { data: rv, reload: reloadRv } = useLoad(() => api.get('/api/week-reviews', { from, to: from }), [from]);
  const [note, setNote] = useState('');
  const [next, setNext] = useState('');
  const [saved, setSaved] = useState('');
  useEffect(() => { setNote(rv?.[0]?.note || ''); setNext(rv?.[0]?.next_goals || ''); setSaved(''); }, [rv]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(Math.min(addDays(ws, 6).getTime(), today.getTime()));
  const isCurrent = from === toISO(startOfWeek(new Date()));

  const st = useMemo(() => rangeStats(D.habits, D.exMap, D.logSet, ws, end), [D.habits, D.exMap, D.logSet, from]); // eslint-disable-line react-hooks/exhaustive-deps

  // Thói quen (kind = habit): tỉ lệ từng cái trong tuần
  const habitRates = useMemo(() => D.habits.filter((h) => h.kind === 'habit').map((h) => {
    let due = 0, done = 0;
    for (let d = new Date(ws); d <= end; d = addDays(d, 1)) {
      if (!isScheduled(h, d)) continue;
      due++;
      if (D.logSet.has(lk(h.id, toISO(d)))) done++;
    }
    return { h, due, done, rate: due ? done / due : 0 };
  }).filter((x) => x.due), [D.habits, D.logSet, from]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <div className="page"><div className="err">{err}</div></div>;

  const tl = B?.time_logs || [];
  const mins = (pred) => sum(tl.filter((t) => pred(t.kind)), (t) => t.minutes);
  const toeicMin = mins((k) => k.startsWith('toeic'));
  const devMin = mins((k) => k === 'backend' || k === 'ai');
  const gym = (B?.workouts || []).length;
  const sleep = B?.sleep || [];
  const onTime = sleep.filter((s) => sleepOnTime(s, goal)).length;
  const weights = (B?.body || []).map((b) => b.weight);
  const avgW = weights.length ? sum(weights) / weights.length : null;
  const good = habitRates.filter((x) => x.rate >= 0.8);
  const weak = habitRates.filter((x) => x.rate < 0.5);
  const late = (B?.tasks_open || []).filter((t) => t.due_on && t.due_on <= to);

  const tips = [];
  if (B) {
    if (gym < 4) tips.push(`Tuần tới thử đặt lại mục tiêu ${Math.min(5, gym + 1)}–5 buổi gym, xếp sẵn giờ vào lịch.`);
    else tips.push(`Gym ${gym} buổi, rất tốt. Giữ nhịp và nhớ ít nhất một ngày nghỉ hoàn toàn.`);
    if (toeicMin < 300) tips.push(`TOEIC mới ${fmtHours(toeicMin)}. Thử chia nhỏ ra mỗi ngày 25 phút bằng Pomodoro cho dễ giữ nhịp.`);
    if (sleep.length && onTime < sleep.length / 2) tips.push('Giờ ngủ còn lệch nhiều. Đặt báo thức "chuẩn bị ngủ" trước 30 phút trong lịch.');
    if (weak.length) tips.push(`Chọn 1–2 thói quen yếu nhất (${weak.slice(0, 2).map((x) => x.h.title).join(', ')}) để tập trung, đừng cố sửa tất cả cùng lúc.`);
    if (late.length) tips.push(`Còn ${late.length} việc sắp hoặc đã quá hạn. Chọn việc quan trọng nhất cho buổi sáng đầu tuần.`);
  }

  async function saveNotes() {
    try { await api.put('/api/week-reviews', { week_start: from, note: note || null, next_goals: next || null }); setSaved('Đã lưu ✓'); reloadRv(); }
    catch (e) { setSaved(e.message); }
  }

  return (
    <div className="page">
      <PageHead title="Tổng kết tuần" onBack={onBack} />
      <div className="nav">
        <button aria-label="Tuần trước" onClick={() => setWs(addDays(ws, -7))}>‹</button>
        <div>{isCurrent ? 'Tuần này · ' : ''}{weekLabel(ws)}</div>
        <button aria-label="Tuần sau" disabled={isCurrent} onClick={() => setWs(addDays(ws, 7))}>›</button>
      </div>
      {!B ? <Loading /> : (
        <>
          <div className="hero hero-flex">
            <Ring pct={st.rate} size={96} sub="hoàn thành" />
            <div className="hero-side">
              <div className="pill"><small>Việc đã xong</small><b>{st.done}/{st.due}</b></div>
              <div className="pill"><small>Task công việc xong</small><b>{B.tasks_done}</b></div>
            </div>
          </div>

          <div className="grid2" style={{ marginTop: 14 }}>
            <div className="mini static"><small>🏋️ Buổi gym</small><b>{gym}/5</b><span>{gym >= 5 ? 'Đạt mục tiêu' : `Còn ${5 - gym} buổi`}</span></div>
            <div className="mini static"><small>😴 Ngủ đúng giờ</small><b>{onTime}/{sleep.length || 0}</b><span>{sleep.length ? `trong ${sleep.length} đêm đã ghi` : 'Chưa ghi giấc ngủ'}</span></div>
            <div className="mini static"><small>🎧 TOEIC</small><b>{fmtHours(toeicMin)}</b><span>tuần này</span></div>
            <div className="mini static"><small>💻 Backend / AI</small><b>{fmtHours(devMin)}</b><span>tuần này</span></div>
            <div className="mini static"><small>⚖️ Cân nặng TB</small><b>{avgW !== null ? `${num1(avgW)}kg` : '—'}</b><span>{weights.length} lần cân</span></div>
            <div className="mini static"><small>💰 Thu nhập</small><b>{fmtVND(B.income)}</b><span>freelancer</span></div>
          </div>

          <div className="section-title">Thói quen duy trì tốt</div>
          {good.length ? (
            <div className="chips-wrap">{good.map((x) => <span className="hchip on" key={x.h.id}>✓ {x.h.title} · {x.done}/{x.due}</span>)}</div>
          ) : <div className="hint light">Chưa có thói quen nào đạt từ 80%. Không sao, tuần sau thử lại với một thói quen thôi.</div>}

          <div className="section-title">Chưa hoàn thành</div>
          {weak.length === 0 && late.length === 0 ? <div className="hint light">Không có gì tồn đọng 🎉</div> : (
            <div className="card">
              {weak.map((x) => <div className="item" key={x.h.id}><div className="grow"><div className="t">{x.h.title}</div><div className="s">Thói quen: mới {x.done}/{x.due} ngày</div></div></div>)}
              {late.map((t) => <div className="item" key={t.id}><div className="grow"><div className="t">{t.title}</div><div className="s">Việc{t.project ? ` · ${t.project}` : ''} · hạn {t.due_on.slice(5).split('-').reverse().join('/')}</div></div></div>)}
            </div>
          )}

          <div className="section-title">Đề xuất cho tuần tới</div>
          <div className="card pad">
            {tips.length ? tips.map((t, i) => <p className="tipline" key={i}>• {t}</p>) : <p className="hint">Chưa đủ dữ liệu để gợi ý.</p>}
          </div>

          <div className="section-title">Ghi chú của bạn</div>
          <div className="card pad">
            <div className="field"><label>Tuần này thế nào?</label><textarea className="input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Điều tốt, điều cần cải thiện…" /></div>
            <div className="field"><label>Mục tiêu tuần tới</label><textarea className="input" rows={3} maxLength={1000} value={next} onChange={(e) => setNext(e.target.value)} placeholder="VD: Gym 5 buổi, TOEIC 6 giờ, xong module thanh toán" /></div>
            <button className="btn" onClick={saveNotes}>Lưu</button>
            {saved && <div className="hint" style={{ textAlign: 'center' }}>{saved}</div>}
          </div>
        </>
      )}
    </div>
  );
}
