import React, { useState } from 'react';
import { Columns, MonthHeat } from './charts.jsx';
import { Empty, Loading, PageHead, Seg } from './ui.jsx';
import {
  addDays, daysLabel, fromISO, habitStreak, isScheduled, itemsOn, logKey, monthLabel, rangeStats, toISO, todayISO, WD_SHORT,
} from '../utils.js';

const isCheck = (h) => h.kind === 'habit';

export default function Habits({ D, onToggle, onEdit, onAdd, onBack }) {
  const { habits, exMap, logSet, loaded } = D;
  const [range, setRange] = useState(7);
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [sel, setSel] = useState(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = todayISO();
  const list = habits.filter(isCheck);
  const current = list.find((h) => h.id === sel) || list[0];

  const from = addDays(today, -(range - 1));
  const st = rangeStats(habits, exMap, logSet, from, today, isCheck);

  const cells = {};
  if (current) {
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dt = new Date(month.getFullYear(), month.getMonth(), d);
      const k = toISO(dt);
      if (dt > today || !isScheduled(current, dt)) continue;
      cells[k] = logSet.has(logKey(current.id, k)) ? 'done' : 'miss';
    }
  }
  const monthRate = (() => {
    const v = Object.values(cells);
    return v.length ? Math.round((v.filter((x) => x === 'done').length / v.length) * 100) : null;
  })();

  const last7 = (h) => Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return isScheduled(h, d) ? (logSet.has(logKey(h.id, toISO(d))) ? 'done' : 'miss') : 'off';
  });

  const doneToday = list.filter((h) => isScheduled(h, today) && logSet.has(logKey(h.id, iso))).length;
  const dueToday = itemsOn(list, exMap, today).length;
  const msg = !dueToday ? 'Hôm nay không có thói quen nào.'
    : doneToday === dueToday ? 'Hoàn thành tất cả hôm nay. Tuyệt vời! 🎉'
    : doneToday ? `Đã xong ${doneToday}/${dueToday}. Cứ từng bước một nhé.`
    : 'Chưa bắt đầu cũng không sao, chọn một việc nhỏ nhất để làm trước.';

  return (
    <div className="page">
      <PageHead title="Thói quen" onBack={onBack} right={<button className="chip on" onClick={onAdd}>+ Thêm</button>} />
      {!loaded ? <Loading /> : !list.length ? (
        <Empty icon="✅" text="Thêm các thói quen bạn muốn giữ mỗi ngày: uống nước, đọc sách, skincare… hoặc nạp bộ mẫu ở mục Lịch → Lịch mẫu." action="+ Thêm thói quen" onAction={onAdd} />
      ) : (
        <>
          <div className="tip">{msg}</div>
          <div className="card">
            {list.map((h) => {
              const scheduled = isScheduled(h, today);
              const done = logSet.has(logKey(h.id, iso));
              const s = habitStreak(h, logSet);
              return (
                <div key={h.id} className={'item' + (done ? ' done' : '') + (current?.id === h.id ? ' picked' : '')}>
                  <button className={'check' + (done ? ' on' : '')} disabled={!scheduled} aria-label="Hoàn thành" onClick={() => onToggle(h.id, iso, !done)}>{done ? '✓' : ''}</button>
                  <button className="grow body" onClick={() => setSel(h.id)}>
                    <div className="t">{h.title}</div>
                    <div className="dots">{last7(h).map((x, i) => <i key={i} className={'d ' + x} />)}<span className="s">{scheduled ? daysLabel(h.days) : 'Hôm nay nghỉ'}</span></div>
                  </button>
                  {s >= 2 && <span className="streak">🔥{s}</span>}
                  <button className="mini-edit" aria-label="Sửa" onClick={() => onEdit(h)}>✎</button>
                </div>
              );
            })}
          </div>

          <div className="section-title">Tỉ lệ hoàn thành</div>
          <Seg value={range} onChange={setRange} options={[[7, '7 ngày'], [30, '30 ngày']]} />
          <div className="card pad">
            <div className="total-box">
              <div className="big">{st.due ? `${st.rate}%` : '—'}</div>
              <small>{st.done}/{st.due} lần trong {range} ngày qua</small>
            </div>
            <Columns
              dense={range > 7} height={110} max={1}
              items={st.perDay.map((d) => ({ value: d.rate, text: d.due ? Math.round(d.rate * 100) + '%' : '', label: WD_SHORT[(fromISO(d.iso).getDay() + 6) % 7] }))}
            />
            <div className="hint" style={{ textAlign: 'center' }}>Bỏ lỡ một ngày không làm mất chuỗi, chỉ khi lỡ hai ngày liên tiếp chuỗi mới bắt đầu lại.</div>
          </div>

          {current && (
            <>
              <div className="section-title">{current.title} <span>{monthRate !== null ? `${monthRate}% tháng này` : ''}</span></div>
              <div className="card pad">
                <div className="nav dark">
                  <button aria-label="Tháng trước" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
                  <div>{monthLabel(month)}</div>
                  <button aria-label="Tháng sau" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
                </div>
                <MonthHeat year={month.getFullYear()} month={month.getMonth()} cells={cells} />
                <div className="legend"><i className="hc done" /> đã làm <i className="hc miss" /> chưa làm <i className="hc off" /> không có lịch</div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
