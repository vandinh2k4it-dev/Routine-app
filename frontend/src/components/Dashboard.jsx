import React, { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { Avatar, userName } from './Avatar.jsx';
import { Columns, Ring } from './charts.jsx';
import SleepSheet from './SleepSheet.jsx';
import {
  WD_SHORT, addDays, byTime, catOf, dayStreak, fmtHours, greeting, itemsOn, logKey, longDate, minutesOf,
  num1, sleepHours, sleepOnTime, startOfWeek, sum, timeLabel, toISO, todayISO, withDefaults, wdIndex,
} from '../utils.js';

export default function Dashboard({ D, user, onToggle, onEdit, go, onProfile }) {
  const { habits, exMap, logSet, settings } = D;
  const goal = withDefaults(settings);
  const now = new Date();
  const today = todayISO();
  const wk = startOfWeek(now);
  const from = toISO(wk), to = toISO(addDays(wk, 6));
  const { data: B, reload } = useLoad(() => api.bundle(from, to), [from, today]);
  const [sleepOpen, setSleepOpen] = useState(false);

  const list = useMemo(() => itemsOn(habits, exMap, now).sort(byTime), [habits, exMap, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const blocks = list.filter((h) => h.kind !== 'habit');
  const checks = list.filter((h) => h.kind === 'habit');
  const done = (h) => logSet.has(logKey(h.id, today));
  const doneCount = list.filter(done).length;
  const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0;
  const streak = dayStreak(habits, exMap, logSet);
  const nowHM = now.toTimeString().slice(0, 5);
  const next = blocks.find((h) => h.start_time && h.start_time >= nowHM && !done(h));
  // Việc đang diễn ra hoặc sắp tới (chưa xong, chưa kết thúc)
  const upcoming = blocks.filter((h) => !done(h) && (h.end_time || h.start_time || '99:99') >= nowHM).slice(0, 4);

  // Dữ liệu tuần
  const tl = B?.time_logs || [];
  const minutes = (pred, day) => sum(tl.filter((t) => pred(t.kind) && (!day || t.logged_on === day)), (t) => t.minutes);
  const isToeic = (k) => k.startsWith('toeic');
  const isDev = (k) => k === 'backend' || k === 'ai';
  const toeicToday = minutes(isToeic, today);
  const toeicPlan = sum(blocks.filter((b) => b.category === 'toeic' && b.end_time), (b) => minutesOf(b.end_time) - minutesOf(b.start_time));
  const gymToday = goal.gym_plan?.[wdIndex(now)];
  const workoutToday = (B?.workouts || []).find((w) => w.done_on === today);
  const gymWeek = (B?.workouts || []).length;
  const sleepToday = (B?.sleep || []).find((s) => s.on_date === today);
  const sh = sleepHours(sleepToday);
  const openTasks = B?.tasks_open || [];
  const dueSoon = openTasks.filter((t) => t.due_on && t.due_on <= toISO(addDays(now, 3)));

  // Tuần: tỉ lệ hoàn thành từng ngày
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(wk, i);
    const l = itemsOn(habits, exMap, d);
    const ok = l.filter((h) => logSet.has(logKey(h.id, toISO(d)))).length;
    return { label: WD_SHORT[i], value: l.length && toISO(d) <= today ? ok / l.length : 0, text: l.length && toISO(d) <= today ? `${Math.round((ok / l.length) * 100)}%` : '' };
  });

  const trained = (n) => (B?.workouts || []).some((w) => w.done_on === toISO(addDays(now, -n)));
  const tip = trained(1) && trained(2) && trained(3) && !workoutToday && gymToday
    ? 'Bạn đã tập liên tục mấy buổi gần đây. Hôm nay nghỉ hoặc tập nhẹ cũng là một phần của tiến bộ 💤'
    : sh !== null && sh < 7 ? `Đêm qua bạn ngủ ${num1(sh)} giờ. Tối nay đi ngủ sớm hơn một chút để cơ bắp phục hồi nhé.` : '';

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="hello">{longDate(now)}</div>
          <h1 className="title">{greeting(now)}, {userName(user)} 👋</h1>
        </div>
        <button className="avatar-btn" onClick={onProfile} aria-label="Hồ sơ"><Avatar user={user} size={44} /></button>
      </div>

      <div className="hero hero-flex">
        <Ring pct={pct} size={104} label={list.length ? `${doneCount}/${list.length}` : '—'} sub="hôm nay" />
        <div className="hero-side">
          <div className="pill"><small>🔥 Streak</small><b>{streak} ngày</b></div>
          <div className="pill"><small>⏰ Kế tiếp</small><b>{next ? `${next.start_time} ${next.title}` : list.length && doneCount === list.length ? 'Xong hết 🎉' : 'Không còn việc có giờ'}</b></div>
        </div>
      </div>

      {tip && <div className="tip">{tip}</div>}

      <div className="section-title">Lịch hôm nay <button className="more" onClick={() => go('schedule')}>Xem timeline ›</button></div>
      {!list.length ? (
        <div className="empty"><div className="em">🗓️</div><p>Chưa có lịch cho hôm nay.</p><button className="chip on" onClick={() => go('schedule')}>Lập lịch</button></div>
      ) : (
        <div className="card">
          {upcoming.map((h) => {
            const c = catOf(h.category);
            return (
              <div key={h.id} className="item">
                <button className="check" aria-label="Hoàn thành" onClick={() => onToggle(h.id, today, true)} />
                <button className="grow body" onClick={() => onEdit(h)}>
                  <div className="t">{h.title}</div>
                  <div className="s">{timeLabel(h)}</div>
                </button>
                <div className="ico" style={{ background: c.color + '26' }}>{c.icon}</div>
              </div>
            );
          })}
          {!upcoming.length && <div className="item"><div className="grow"><div className="t">Không còn việc nào có giờ cho hôm nay 🎉</div></div></div>}
        </div>
      )}

      {checks.length > 0 && (
        <>
          <div className="section-title">Thói quen <button className="more" onClick={() => go('habits')}>Tất cả ›</button></div>
          <div className="chips-wrap">
            {checks.map((h) => (
              <button key={h.id} className={'hchip' + (done(h) ? ' on' : '')} onClick={() => onToggle(h.id, today, !done(h))}>
                {done(h) ? '✓ ' : ''}{h.title}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Hôm nay</div>
      <div className="grid2">
        <button className="mini" onClick={() => go('fitness')}>
          <small>🏋️ Gym</small>
          <b>{workoutToday ? 'Đã tập ✓' : gymToday || 'Ngày nghỉ'}</b>
          <span>{workoutToday ? workoutToday.name : `${gymWeek} buổi tuần này`}</span>
        </button>
        <button className="mini" onClick={() => go('toeic')}>
          <small>🎧 TOEIC</small>
          <b>{fmtHours(toeicToday)}</b>
          <span>{toeicPlan ? `Kế hoạch ${fmtHours(toeicPlan)}` : `Tuần này ${fmtHours(minutes(isToeic))}`}</span>
        </button>
        <button className="mini" onClick={() => go('work')}>
          <small>💼 Công việc</small>
          <b>{openTasks.length} việc mở</b>
          <span>{dueSoon.length ? `${dueSoon.length} việc sắp đến hạn` : `${fmtHours(minutes((k) => !isToeic(k)))} tuần này`}</span>
        </button>
        <button className="mini" onClick={() => setSleepOpen(true)}>
          <small>😴 Giấc ngủ</small>
          <b>{sh !== null ? `${num1(sh)} giờ` : 'Chưa ghi'}</b>
          <span>{sleepToday ? `${sleepToday.bedtime} → ${sleepToday.wake_time}${sleepOnTime(sleepToday, goal) ? ' · đúng giờ ✓' : ''}` : `Mục tiêu ${goal.bed} → ${goal.wake}`}</span>
        </button>
      </div>

      <div className="section-title">Tuần này <span>{fmtHours(minutes(isDev))} Backend/AI · {fmtHours(minutes(isToeic))} TOEIC</span></div>
      <div className="card pad">
        <Columns items={week} max={1} height={110} />
      </div>

      {sleepOpen && (
        <SleepSheet date={today} initial={sleepToday} goal={goal} onClose={() => setSleepOpen(false)} onSaved={() => { setSleepOpen(false); reload(); }} />
      )}
    </div>
  );
}
