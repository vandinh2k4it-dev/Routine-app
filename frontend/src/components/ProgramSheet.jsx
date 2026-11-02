import React, { useState } from 'react';
import ExerciseDemo from './ExerciseDemo.jsx';
import { estimateMinutes, videoUrl, weeklySets } from '../program.js';
import { WD_SHORT } from '../utils.js';
import { Sheet } from './ui.jsx';

const SOURCES = [
  ['Tổng quan nghiên cứu về khối lượng tập (PMC)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/'],
  ['Các bài tập cho dáng chữ V (Legion Athletics)', 'https://legionathletics.com/v-taper'],
];

const repsText = (x) => (x.reps[0] === x.reps[1] ? x.reps[0] : `${x.reps[0]}–${x.reps[1]}`) + (x.timed ? 's' : '');

/** Xem cả chương trình trong tuần; mở từng bài để xem gợi ý kỹ thuật. */
export default function ProgramSheet({ program, onClose, onStart, onImport, onExport, onReset }) {
  const [open, setOpen] = useState(null); // "ngày-bài" đang mở
  const vol = weeklySets(program);
  return (
    <Sheet title={program.name} onClose={onClose}>
      {program.custom ? (
        <p className="hint" style={{ marginTop: 0 }}>Chương trình do bạn nhập từ Excel. Sửa file rồi nhập lại để cập nhật.</p>
      ) : (
        <p className="hint" style={{ marginTop: 0 }}>{program.note}</p>
      )}
      <div className="progtools">
        <button className="chip on" onClick={onImport}>📥 Nhập từ Excel</button>
        <button className="chip" onClick={onExport}>📄 {program.custom ? 'Xuất ra Excel' : 'Tải file mẫu'}</button>
        {program.custom && <button className="chip" onClick={onReset}>↩ Dùng chương trình mẫu</button>}
      </div>
      {!program.custom && (
        <div className="chips-wrap tight" style={{ marginBottom: 14 }}>
          {Object.entries(vol).map(([m, n]) => <span className="hchip" key={m}>{m}: {n} hiệp/tuần</span>)}
        </div>
      )}

      {program.days.map((d, di) => (
        <div className="progday" key={di}>
          <div className="proghead">
            <div><b>{d.weekday !== null ? `${WD_SHORT[d.weekday]} · ` : ''}{d.title}</b><small>{d.items.length} bài · khoảng {estimateMinutes(d)} phút{d.focus ? ` · ${d.focus}` : ''}</small></div>
            <button className="chip on" onClick={() => onStart(di)}>Tập</button>
          </div>
          {d.items.map((x, xi) => {
            const id = `${di}-${xi}`;
            const hasMore = x.cues.length > 0 || x.note || x.weight;
            return (
              <div key={id}>
                <button className="progrow" onClick={() => setOpen(open === id ? null : id)}>
                  <span>{x.vi && x.vi.toLowerCase() !== x.name.toLowerCase() ? x.vi : x.name}{x.vi && x.vi.toLowerCase() !== x.name.toLowerCase() && <small>{x.name}</small>}</span>
                  <em>{x.sets} × {repsText(x)}{x.weight ? ` · ${x.weight}kg` : ''}</em>
                </button>
                {open === id && (
                  <div className="progcues">
                    <ExerciseDemo item={x} />
                    {x.note && <div className="pnote">📝 {x.note}</div>}
                    {x.cues.length > 0 && <ul>{x.cues.map((c, k) => <li key={k}>{c}</li>)}</ul>}
                    {!hasMore && <div className="hint" style={{ margin: '0 0 6px' }}>Nghỉ {x.rest} giây giữa các hiệp.</div>}
                    <a href={videoUrl(x)} target="_blank" rel="noreferrer">▶ Xem video hướng dẫn</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {!program.custom && (
        <div className="hint" style={{ marginTop: 14 }}>
          Đây là mẫu khởi đầu dựa trên các nguyên tắc phổ biến (10–20 hiệp mỗi nhóm cơ mỗi tuần, tập mỗi nhóm 2 lần, tăng tạ khi đủ reps). Hãy chỉnh theo cảm nhận và khả năng phục hồi của bạn. Nguồn tham khảo:{' '}
          {SOURCES.map(([t, u], i) => <span key={u}>{i ? ' · ' : ''}<a href={u} target="_blank" rel="noreferrer">{t}</a></span>)}
        </div>
      )}
      <div className="btn-row"><button className="btn ghost" onClick={onClose}>Đóng</button></div>
    </Sheet>
  );
}
