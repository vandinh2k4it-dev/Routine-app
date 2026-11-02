import React, { useMemo, useState } from 'react';
import { Avatar, userName } from './Avatar.jsx';
import {
  WD_SHORT, addDays, byTime, catOf, dayStreak, dayTitle, fromISO, habitStreak, isScheduled,
  logKey, remindLabel, startOfWeek, timeLabel, toISO, todayISO, toLogSet,
} from '../utils.js';

export default function Today({ user, habits, logs, loaded, onToggle, onEdit, onAdd, onProfile }) {
  const [date, setDate] = useState(todayISO());
  const today = todayISO();
  const isFuture = date > today;
  const logSet = useMemo(() => toLogSet(logs), [logs]);

  const weekStart = startOfWeek(fromISO(date));
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const list = habits.filter((h) => isScheduled(h, fromISO(date))).sort(byTime);
  const doneCount = list.filter((h) => logSet.has(logKey(h.id, date))).length;
  const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0;
  const streak = dayStreak(habits, logSet);

  // Việc kế tiếp (chỉ khi xem hôm nay)
  const nowHM = new Date().toTimeString().slice(0, 5);
  const next = date === today
    ? list.find((h) => h.start_time && h.start_time >= nowHM && !logSet.has(logKey(h.id, date)))
    : null;

  const dayRing = (d) => {
    const iso = toISO(d);
    const due = habits.filter((h) => isScheduled(h, d));
    if (!due.length || iso > today) return null;
    return due.every((h) => logSet.has(logKey(h.id, iso))) ? 'full' : due.some((h) => logSet.has(logKey(h.id, iso))) ? 'part' : 'none';
  };

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="hello">Xin chào, {userName(user)} 👋</div>
          <h1 className="title">{dayTitle(date)}</h1>
        </div>
        <button className="avatar-btn" onClick={onProfile} aria-label="Hồ sơ"><Avatar user={user} size={44} /></button>
      </div>

      <div className="weekbar">
        <button aria-label="Tuần trước" onClick={() => setDate(toISO(addDays(fromISO(date), -7)))}>‹</button>
        <div className="wdays">
          {week.map((d, i) => {
            const iso = toISO(d);
            const ring = dayRing(d);
            return (
              <button key={iso} className={'wd' + (iso === date ? ' on' : '') + (iso === today ? ' today' : '')} onClick={() => setDate(iso)}>
                <small>{WD_SHORT[i]}</small>
                <b>{d.getDate()}</b>
                <i className={'dot ' + (ring || '')} />
              </button>
            );
          })}
        </div>
        <button aria-label="Tuần sau" onClick={() => setDate(toISO(addDays(fromISO(date), 7)))}>›</button>
      </div>
      {date !== today && <button className="link-light" onClick={() => setDate(today)}>Về hôm nay</button>}

      <div className="hero">
        <small>{isFuture ? 'Kế hoạch ngày này' : 'Tiến độ'}</small>
        <div className="big">{list.length ? `${doneCount}/${list.length} việc` : '—'}</div>
        <div className="progress"><i style={{ width: `${pct}%` }} /></div>
        <div className="row">
          <div className="pill"><small>🔥 Chuỗi ngày</small><b>{streak} ngày</b></div>
          <div className="pill">
            <small>⏰ Việc kế tiếp</small>
            <b>{next ? `${next.start_time} ${next.title}` : list.length && doneCount === list.length ? 'Xong hết 🎉' : '—'}</b>
          </div>
        </div>
      </div>

      <div className="section-title">Lịch trình <span>{list.length} việc</span></div>
      {!loaded ? (
        <div className="loading"><span className="spin" /></div>
      ) : !list.length ? (
        <div className="empty">
          <div className="em">🗓️</div>
          <p>{habits.length ? 'Ngày này chưa có việc nào.' : 'Chưa có lịch trình nào.'}</p>
          <button className="chip on" onClick={onAdd}>+ Thêm hoạt động</button>
        </div>
      ) : (
        <div className="card">
          {list.map((h) => {
            const c = catOf(h.category);
            const done = logSet.has(logKey(h.id, date));
            const s = habitStreak(h, logSet);
            return (
              <div key={h.id} className={'item' + (done ? ' done' : '')}>
                <button
                  className={'check' + (done ? ' on' : '')}
                  disabled={isFuture}
                  aria-label={done ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
                  onClick={() => onToggle(h.id, date, !done)}
                >{done ? '✓' : ''}</button>
                <button className="grow body" onClick={() => onEdit(h)}>
                  <div className="t">{h.title}</div>
                  <div className="s">
                    {timeLabel(h)}
                    {h.remind_before !== null && h.start_time ? ` · 🔔 ${remindLabel(h.remind_before)}` : ''}
                  </div>
                  {h.note && <div className="s note">{h.note}</div>}
                </button>
                {s >= 2 && <span className="streak">🔥{s}</span>}
                <div className="ico" style={{ background: c.color + '26' }}>{c.icon}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
