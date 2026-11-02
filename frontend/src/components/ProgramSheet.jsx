import React, { useState } from 'react';
import { EXERCISES, PROGRAM, estimateMinutes, isTimed, videoUrl, weeklySets } from '../program.js';
import { WD_SHORT } from '../utils.js';
import { Sheet } from './ui.jsx';

const SOURCES = [
  ['Tổng quan nghiên cứu về khối lượng tập (PMC)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/'],
  ['Các bài tập cho dáng chữ V (Legion Athletics)', 'https://legionathletics.com/v-taper'],
];

/** Xem cả chương trình trong tuần và thư viện bài tập kèm gợi ý kỹ thuật. */
export default function ProgramSheet({ onClose, onStart }) {
  const [open, setOpen] = useState(null); // id bài đang mở gợi ý
  const vol = weeklySets();
  return (
    <Sheet title={PROGRAM.name} onClose={onClose}>
      <p className="hint" style={{ marginTop: 0 }}>{PROGRAM.note}</p>
      <div className="chips-wrap tight" style={{ marginBottom: 14 }}>
        {Object.entries(vol).map(([m, n]) => <span className="hchip" key={m}>{m}: {n} hiệp/tuần</span>)}
      </div>

      {PROGRAM.days.map((d) => (
        <div className="progday" key={d.idx}>
          <div className="proghead">
            <div><b>{WD_SHORT[d.idx]} · {d.title}</b><small>{d.items.length} bài · khoảng {estimateMinutes(d)} phút · {d.focus}</small></div>
            <button className="chip on" onClick={() => onStart(d)}>Tập</button>
          </div>
          {d.items.map((x) => {
            const e = EXERCISES[x.ex];
            return (
              <div key={x.ex}>
                <button className="progrow" onClick={() => setOpen(open === x.ex ? null : x.ex)}>
                  <span>{e.vi}<small>{e.en}</small></span>
                  <em>{x.sets} × {x.reps[0]}–{x.reps[1]}{isTimed(x.ex) ? 's' : ''}</em>
                </button>
                {open === x.ex && (
                  <div className="progcues">
                    <ul>{e.cues.map((c, k) => <li key={k}>{c}</li>)}</ul>
                    <a href={videoUrl(x.ex)} target="_blank" rel="noreferrer">▶ Xem video hướng dẫn</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="hint" style={{ marginTop: 14 }}>
        Đây là mẫu khởi đầu dựa trên các nguyên tắc phổ biến (10–20 hiệp mỗi nhóm cơ mỗi tuần, tập mỗi nhóm 2 lần, tăng tạ khi đủ reps). Hãy chỉnh theo cảm nhận và khả năng phục hồi của bạn. Nguồn tham khảo:{' '}
        {SOURCES.map(([t, u], i) => <span key={u}>{i ? ' · ' : ''}<a href={u} target="_blank" rel="noreferrer">{t}</a></span>)}
      </div>
      <div className="btn-row"><button className="btn ghost" onClick={onClose}>Đóng</button></div>
    </Sheet>
  );
}
