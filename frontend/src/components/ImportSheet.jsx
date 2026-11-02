import React, { useRef, useState } from 'react';
import { api } from '../api.js';
import { downloadProgramXlsx, readProgramFile } from '../excelProgram.js';
import { estimateMinutes, itemFromCustom } from '../program.js';
import { WD_SHORT } from '../utils.js';
import { Sheet } from './ui.jsx';

const repsText = (x) => (x.reps[0] === x.reps[1] ? x.reps[0] : `${x.reps[0]}–${x.reps[1]}`) + (x.timed ? 's' : '');

/** Chọn file Excel/CSV, xem trước kết quả đọc được, rồi mới lưu làm chương trình tập. */
export default function ImportSheet({ templateDays, onClose, onImported }) {
  const [res, setRes] = useState(null); // { days, warnings, errors }
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showWarn, setShowWarn] = useState(false);
  const fileRef = useRef(null);

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setRes(null); setBusy(true);
    try {
      const r = await readProgramFile(f);
      setRes(r);
      setName(f.name.replace(/\.[^.]+$/, '').slice(0, 60));
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  }

  async function save() {
    if (!name.trim()) return setErr('Hãy đặt tên cho chương trình');
    setBusy(true); setErr('');
    try {
      const saved = await api.put('/api/program', { name: name.trim(), days: res.days });
      onImported(saved);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  const ok = res && !res.errors.length;
  return (
    <Sheet title="Nhập chương trình từ Excel" onClose={onClose}>
      {err && <div className="err">{err}</div>}

      {!res && (
        <>
          <p className="hint" style={{ marginTop: 0 }}>Soạn bài tập trong Excel rồi nhập vào đây. Mỗi dòng là một bài: <b>Ngày, Buổi, Bài tập, Số hiệp, Reps, Nghỉ, Tạ, Ghi chú, Link video</b>. Tải file mẫu về sửa cho nhanh.</p>
          <button className="btn ghost" onClick={() => downloadProgramXlsx(templateDays.days, 'chuong-trinh-tap-mau.xlsx', templateDays.extraNote)}>📄 Tải file mẫu (.xlsx)</button>
          <button className="btn" disabled={busy} style={{ marginTop: 10 }} onClick={() => fileRef.current?.click()}>{busy ? 'Đang đọc file…' : '📥 Chọn file Excel hoặc CSV'}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden onChange={pick} />
          <div className="hint">File chỉ được đọc ngay trên máy bạn, chỉ chương trình sau khi bạn xác nhận mới được lưu.</div>
        </>
      )}

      {res && (
        <>
          {res.errors.map((m, i) => <div className="err" key={i}>{m}</div>)}
          {ok && (
            <>
              <div className="field"><label>Tên chương trình</label><input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></div>
              <div className="hint" style={{ marginTop: -6 }}>Đọc được {res.days.length} buổi, {res.days.reduce((a, d) => a + d.items.length, 0)} bài. Kiểm tra lại trước khi dùng:</div>
              {res.days.map((d, di) => (
                <div className="progday" key={di}>
                  <div className="proghead"><div><b>{d.weekday !== null ? `${WD_SHORT[d.weekday]} · ` : ''}{d.title}</b><small>{d.items.length} bài · khoảng {estimateMinutes({ items: d.items.map(itemFromCustom) })} phút{d.weekday === null ? ' · chưa gán ngày, bạn tự chọn khi tập' : ''}</small></div></div>
                  {d.items.map((x, xi) => (
                    <div className="progrow static" key={xi}>
                      <span>{x.name}{x.note && <small>📝 {x.note}</small>}</span>
                      <em>{x.sets} × {repsText(x)} · nghỉ {x.rest}s{x.weight ? ` · ${x.weight}kg` : ''}</em>
                    </div>
                  ))}
                </div>
              ))}
              {res.warnings.length > 0 && (
                <div className="warnbox">
                  <button onClick={() => setShowWarn((v) => !v)}>⚠️ {res.warnings.length} lưu ý khi đọc file {showWarn ? '▲' : '▼'}</button>
                  {showWarn && <ul>{res.warnings.map((m, i) => <li key={i}>{m}</li>)}</ul>}
                </div>
              )}
              <button className="btn" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : 'Dùng chương trình này'}</button>
            </>
          )}
          <div className="btn-row">
            <button className="btn ghost" onClick={() => { setRes(null); setErr(''); }}>Chọn file khác</button>
            <button className="btn ghost" onClick={onClose}>Hủy</button>
          </div>
        </>
      )}
      {!res && <div className="btn-row"><button className="btn ghost" onClick={onClose}>Đóng</button></div>}
    </Sheet>
  );
}
