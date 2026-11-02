import React from 'react';

/** Vòng tròn tiến độ. */
export function Ring({ pct = 0, size = 96, stroke = 10, label, sub }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringg)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
        <defs>
          <linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe28a" /><stop offset="1" stopColor="#ff9fe0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ring-txt"><b>{label ?? `${Math.round(p)}%`}</b>{sub && <small>{sub}</small>}</div>
    </div>
  );
}

/** Biểu đồ đường. points: [{ x: nhãn, y: số }]. */
export function LineChart({ points, color = '#6d4aff', height = 140, unit = '', decimals = 1 }) {
  const pts = (points || []).filter((p) => p.y !== null && p.y !== undefined);
  if (pts.length < 2) {
    return <div className="chart-empty">{pts.length ? `${fmt(pts[0].y, decimals)}${unit} · cần thêm dữ liệu để vẽ biểu đồ` : 'Chưa có dữ liệu'}</div>;
  }
  const W = 320, H = height, padL = 8, padR = 8, padT = 18, padB = 22;
  const ys = pts.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const m = (hi - lo) * 0.15; lo -= m; hi += m;
  const X = (i) => padL + (i * (W - padL - padR)) / (pts.length - 1);
  const Y = (v) => padT + ((hi - v) * (H - padT - padB)) / (hi - lo);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${X(pts.length - 1).toFixed(1)},${H - padB} L${X(0).toFixed(1)},${H - padB} Z`;
  const last = pts[pts.length - 1];
  const gid = 'lg' + color.replace('#', '');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {pts.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.y)} r="3.2" fill="var(--card)" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
      <text x={X(pts.length - 1)} y={Y(last.y) - 8} textAnchor="end" className="chart-val">{fmt(last.y, decimals)}{unit}</text>
      <text x={padL} y={H - 6} className="chart-lbl">{pts[0].x}</text>
      <text x={W - padR} y={H - 6} textAnchor="end" className="chart-lbl">{last.x}</text>
    </svg>
  );
}
const fmt = (n, d) => (Math.round(n * 10 ** d) / 10 ** d).toString();

/** Cột. items: [{ label, value (0-1 hoặc số), text?, color? }]. */
export function Columns({ items, max, height = 120, dense }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={'bars' + (dense ? ' dense' : '')} style={{ height }}>
      {items.map((it, i) => (
        <div className="bar" key={i}>
          {!dense && <em>{it.text ?? ''}</em>}
          <i className={it.value ? '' : 'zero'} style={{ height: `${Math.max((it.value / top) * 100, 2)}%`, ...(it.color ? { background: it.color } : {}) }} />
          {!dense && <span>{it.label}</span>}
        </div>
      ))}
    </div>
  );
}

/** Thanh tiến độ nhỏ. */
export function Meter({ value, goal, color = 'var(--brand)', label, unit = '' }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="meter">
      <div className="top"><span>{label}</span><span>{Math.round(value || 0)}{goal ? ` / ${Math.round(goal)}` : ''}{unit}</span></div>
      <div className="track"><i style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

/** Lịch tháng dạng ô: cells = { 'YYYY-MM-DD': 'done' | 'miss' | 'off' }. */
export function MonthHeat({ year, month, cells }) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const out = [];
  for (let i = 0; i < lead; i++) out.push(<i key={'l' + i} className="hc empty" />);
  for (let d = 1; d <= days; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    out.push(<i key={d} className={'hc ' + (cells[iso] || 'off')}>{d}</i>);
  }
  return (
    <div className="heat">
      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w) => <b key={w}>{w}</b>)}
      {out}
    </div>
  );
}
