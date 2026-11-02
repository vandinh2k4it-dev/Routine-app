import React, { useMemo } from 'react';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { Avatar, userName } from './Avatar.jsx';
import { Loading } from './ui.jsx';
import { dayForWeekday, estimateMinutes, getProgram } from '../program.js';
import { addDays, greeting, longDate, num1, startOfWeek, toISO, todayISO, wdIndex } from '../utils.js';

/** Màn "Hôm nay": buổi tập theo chương trình, tiến độ tuần, cân nặng mới nhất. */
export default function Today({ user, settings, go, onProfile }) {
  const now = new Date();
  const today = todayISO();
  const from = toISO(startOfWeek(now));
  const { data: prog } = useLoad(() => api.get('/api/program'), []);
  const { data: ws } = useLoad(() => api.get('/api/workouts', { from, to: toISO(addDays(now, 1)) }), [from, today]);
  const { data: body } = useLoad(() => api.get('/api/body', { from: toISO(addDays(now, -120)), to: toISO(addDays(now, 1)) }), [today]);
  const program = useMemo(() => getProgram(prog?.program || null), [prog]);
  if (!prog || !ws) return <div className="page"><Loading /></div>;

  const idx = dayForWeekday(program, wdIndex(now));
  const day = idx >= 0 ? program.days[idx] : null;
  const doneToday = ws.some((w) => w.done_on === today);
  const target = settings?.days_per_week || 4;
  const lastW = [...(body || [])].reverse().find((r) => r.weight !== null);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="hello muted">{longDate(now)}</div>
          <h1 className="title">{greeting(now)}, {userName(user)}</h1>
        </div>
        <button className="avatarbtn" onClick={onProfile} aria-label="Tài khoản"><Avatar user={user} size={40} /></button>
      </div>

      <div className="card pad progcard">
        <small>🏋️ Hôm nay</small>
        {doneToday ? <b>Đã tập xong ✓ Nghỉ ngơi và ăn đủ protein nhé</b>
          : day ? <b>{day.title}</b> : <b>Hôm nay là ngày nghỉ 💤</b>}
        {day && !doneToday && <p>{day.items.length} bài · khoảng {estimateMinutes(day)} phút{day.focus ? ` · ${day.focus}` : ''}</p>}
        <button className="btn" onClick={() => go('train')}>{doneToday ? 'Xem buổi tập' : day ? '▶ Vào tập' : 'Mở phần tập'}</button>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        <button className="mini" onClick={() => go('train')}>
          <small>📅 Tuần này</small>
          <b>{ws.length}/{target} buổi</b>
          <span>{ws.length >= target ? 'Đủ chỉ tiêu tuần 🎉' : `Còn ${target - ws.length} buổi`}</span>
        </button>
        <button className="mini" onClick={() => go('train')}>
          <small>⚖️ Cân nặng</small>
          <b>{lastW ? `${num1(lastW.weight)} kg` : '—'}</b>
          <span>{settings?.weight_goal ? `Mục tiêu ${settings.weight_goal} kg` : 'Chưa đặt mục tiêu'}</span>
        </button>
      </div>

      {settings?.meal_plan && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <b>🥗 Thực đơn gợi ý hôm nay</b>
          <p className="hint" style={{ margin: '4px 0 8px' }}>{settings.calories} kcal · protein {settings.protein}g</p>
          <div className="mealplan">{settings.meal_plan}</div>
        </div>
      )}

      <button className="card pad tipbtn" style={{ marginTop: 14, width: '100%', textAlign: 'left' }} onClick={() => go('coach')}>
        🤖 <b>Hỏi PT ảo</b>
        <p className="hint" style={{ margin: '4px 0 0' }}>Hôm nay tập gì, ăn gì, hay bạn đang mệt? PT biết dữ liệu của bạn.</p>
      </button>
    </div>
  );
}
