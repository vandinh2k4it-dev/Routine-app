import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { PageHead } from './ui.jsx';
import { todayISO } from '../utils.js';

// Lưu trên máy (khóa bắt đầu bằng "cache:" nên tự bị xóa khi đăng xuất / đổi tài khoản)
const KEY = 'cache:coach-chat';
const MAX_SAVED = 40;

const SUGGESTIONS = [
  'Hôm nay mình nên tập gì?',
  'Phân tích tiến độ tập luyện của mình tuần này',
  'Dinh dưỡng của mình đã đủ protein chưa?',
  'Lên kế hoạch tập và ăn cho tuần tới',
  'Mình ngủ như vậy có ảnh hưởng đến việc tăng cơ không?',
];

function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch { return []; }
}

/** Hiển thị tối giản: đoạn văn, gạch đầu dòng, **in đậm**. Không dùng HTML thô nên an toàn. */
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <b key={i}>{p.slice(2, -2)}</b> : p));
}
function Rich({ text }) {
  const out = [];
  let list = [];
  const flush = () => { if (list.length) { out.push(<ul key={'u' + out.length}>{list.map((x, i) => <li key={i}>{inline(x)}</li>)}</ul>); list = []; } };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = /^([-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) { list.push(bullet[2]); continue; }
    flush();
    if (!line) continue;
    const head = /^#{1,4}\s+(.*)$/.exec(line);
    out.push(<p key={out.length}>{head ? <b>{inline(head[1])}</b> : inline(line)}</p>);
  }
  flush();
  return <>{out}</>;
}

export default function Coach({ settings, onBack, onSettings }) {
  const [msgs, setMsgs] = useState(load);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-MAX_SAVED))); } catch { /* bỏ qua */ }
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, busy]);

  async function send(q) {
    const content = (q ?? text).trim();
    if (!content || busy) return;
    const next = [...msgs, { role: 'user', content }];
    setMsgs(next); setText(''); setErr(''); setBusy(true);
    try {
      const r = await api.post('/api/ai/coach', { messages: next.slice(-16), today: todayISO() });
      setMsgs((m) => [...m, { role: 'assistant', content: r.reply }]);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const noProfile = settings && !settings.height && !settings.goal_note;

  return (
    <div className="page chatpage">
      <PageHead
        title="PT ảo"
        onBack={onBack}
        right={msgs.length > 0 && <button className="chip" onClick={() => { if (confirm('Xóa cuộc trò chuyện này?')) { setMsgs([]); setErr(''); } }}>Làm mới</button>}
      />
      <div className="hint light" style={{ marginTop: -8 }}>Trợ lý AI đọc dữ liệu tập luyện, số đo, dinh dưỡng và giấc ngủ của bạn. Không thay thế bác sĩ.</div>

      {noProfile && (
        <button className="tip tipbtn" onClick={onSettings}>💡 Điền chiều cao, tuổi và mục tiêu để PT tư vấn sát hơn <b>→ Mục tiêu</b></button>
      )}

      <div className="chat">
        {!msgs.length && (
          <div className="suggest">
            <p>Hỏi mình bất cứ điều gì về tập luyện, ăn uống, ngủ nghỉ:</p>
            {SUGGESTIONS.map((s) => <button key={s} className="hchip" onClick={() => send(s)}>{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={'bubble ' + (m.role === 'user' ? 'me' : 'bot')}>
            {m.role === 'user' ? m.content : <Rich text={m.content} />}
          </div>
        ))}
        {busy && <div className="bubble bot typing"><span /><span /><span /></div>}
        {err && <div className="err">{err} <button className="retry" onClick={() => send(msgs[msgs.length - 1]?.content)}>Thử lại</button></div>}
        <div ref={endRef} />
      </div>

      <form className="chatbar" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="input" placeholder="Nhắn cho PT…" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />
        <button className="btn" disabled={busy || !text.trim()} aria-label="Gửi">➤</button>
      </form>
    </div>
  );
}
