import React, { useMemo, useState } from 'react';
import {
  WD_SHORT, addDays, catOf, dayStreak, fromISO, habitStreak, isScheduled, logKey, rangeStats, toISO, toLogSet,
} from '../utils.js';

export default function Stats({ habits, logs, loaded }) {
  const [range, setRange] = useState(7);
  const logSet = useMemo(() => toLogSet(logs), [logs]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = addDays(today, -(range - 1));
  const st = rangeStats(habits, logSet, from, today);
  const streak = dayStreak(habits, logSet);

  // Tỉ lệ từng hoạt động trong khoảng đang xem
  const perHabit = habits.map((h) => {
    let due = 0, done = 0;
    for (let d = new Date(from); d <= today; d = addDays(d, 1)) {
      if (!isScheduled(h, d)) continue;
      due++;
      if (logSet.has(logKey(h.id, toISO(d)))) done++;
    }
    return { h, due, done, rate: due ? Math.round((done / due) * 100) : 0, streak: habitStreak(h, logSet) };
  }).filter((x) => x.due).sort((a, b) => b.rate - a.rate);

  return (
    <div className="page">
      <div className="topbar"><h1 className="title">Thống kê</h1></div>
      <div className="seg">
        <button className={range === 7 ? 'on' : ''} onClick={() => setRange(7)}>7 ngày</button>
        <button className={range === 30 ? 'on' : ''} onClick={() => setRange(30)}>30 ngày</button>
      </div>

      {!loaded ? (
        <div className="loading"><span className="spin" /></div>
      ) : (
        <>
          <div className="card pad">
            <div className="total-box">
              <small>Tỉ lệ hoàn thành</small>
              <div className="big">{st.due ? `${st.rate}%` : '—'}</div>
              <small>{st.done}/{st.due} việc trong {range} ngày qua</small>
            </div>
            <div className="tri">
              <div><small>🔥 Chuỗi ngày</small><b>{streak}</b></div>
              <div><small>Đã xong</small><b>{st.done}</b></div>
              <div><small>Bỏ lỡ</small><b>{st.due - st.done}</b></div>
            </div>
            <div className={'bars' + (range > 7 ? ' dense' : '')}>
              {st.perDay.map((d) => {
                const r = d.due ? d.done / d.due : 0;
                return (
                  <div className="bar" key={d.iso}>
                    {range === 7 && <em>{d.due ? Math.round(r * 100) + '%' : ''}</em>}
                    <i className={d.due && d.done ? '' : 'zero'} style={{ height: `${Math.max(r * 100, 2)}%` }} />
                    {range === 7 && <span>{WD_SHORT[(fromISO(d.iso).getDay() + 6) % 7]}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section-title">Từng hoạt động <span>{range} ngày</span></div>
          {perHabit.length ? (
            <div className="card pad">
              {perHabit.map(({ h, due, done, rate, streak: s }) => {
                const c = catOf(h.category);
                return (
                  <div className="cat-row" key={h.id}>
                    <div className="ico" style={{ background: c.color + '26' }}>{c.icon}</div>
                    <div className="grow">
                      <div className="top"><span>{h.title}{s >= 2 ? ` 🔥${s}` : ''}</span><span>{done}/{due} · {rate}%</span></div>
                      <div className="track"><i style={{ width: `${rate}%`, background: c.color }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty"><div className="em">📊</div><p>Chưa có dữ liệu. Thêm hoạt động và bắt đầu tick nhé.</p></div>
          )}
        </>
      )}
    </div>
  );
}
