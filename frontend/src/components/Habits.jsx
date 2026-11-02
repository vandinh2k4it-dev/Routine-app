import React from 'react';
import { byTime, catOf, daysLabel, remindLabel, timeLabel } from '../utils.js';

export default function Habits({ habits, loaded, onEdit, onAdd }) {
  const sorted = [...habits].sort(byTime);
  return (
    <div className="page">
      <div className="topbar"><h1 className="title">Tất cả hoạt động</h1></div>

      {!loaded ? (
        <div className="loading"><span className="spin" /></div>
      ) : !sorted.length ? (
        <div className="empty">
          <div className="em">🌱</div>
          <p>Thêm việc bạn muốn làm đều đặn: tập gym, học bài, làm việc…</p>
          <button className="chip on" onClick={onAdd}>+ Thêm hoạt động</button>
        </div>
      ) : (
        <div className="card">
          {sorted.map((h) => {
            const c = catOf(h.category);
            return (
              <button key={h.id} className="item" onClick={() => onEdit(h)}>
                <div className="ico" style={{ background: c.color + '26' }}>{c.icon}</div>
                <div className="grow">
                  <div className="t">{h.title}</div>
                  <div className="s">{timeLabel(h)} · {daysLabel(h.days)}</div>
                </div>
                {h.remind_before !== null && h.start_time && <span className="s" title={remindLabel(h.remind_before)}>🔔</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
