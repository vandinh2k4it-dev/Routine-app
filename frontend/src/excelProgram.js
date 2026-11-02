// Đọc / ghi chương trình tập từ file Excel (.xlsx) hoặc CSV.
// Phần phân tích (parseRows, toSheetData) là hàm thuần, không phụ thuộc trình duyệt nên test được riêng.

export const COLUMNS = ['Ngày', 'Buổi', 'Bài tập', 'Số hiệp', 'Reps', 'Nghỉ (giây)', 'Tạ (kg)', 'Ghi chú', 'Link video'];

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '');

const ROLES = {
  day: ['ngay', 'thu', 'day', 'weekday', 'ngaytap'],
  session: ['buoi', 'buoitap', 'tenbuoi', 'session', 'workout', 'nhom', 'nhomco', 'title'],
  exercise: ['baitap', 'tenbaitap', 'exercise', 'bai', 'ten', 'name', 'tenbai'],
  sets: ['sohiep', 'hiep', 'set', 'sets', 'sohieptap'],
  reps: ['reps', 'sorep', 'rep', 'solan', 'solanlap', 'repetitions', 'repetition'],
  rest: ['nghi', 'nghigiay', 'thoigiannghi', 'rest', 'restsec', 'nghis'],
  weight: ['ta', 'takg', 'tagoiy', 'mucta', 'weight', 'kg', 'tagoiykg'],
  note: ['ghichu', 'note', 'notes', 'luuy', 'nhanxet'],
  url: ['link', 'video', 'linkvideo', 'url', 'huongdan', 'linkhuongdan'],
};

/** Đoán vai trò của một ô tiêu đề: khớp chính xác thắng khớp tiền tố (tiền tố chỉ dùng cho từ khóa dài từ 3 ký tự). */
function roleOf(header) {
  const h = norm(header);
  if (!h) return null;
  let best = null, score = 0;
  for (const [role, aliases] of Object.entries(ROLES)) {
    for (const a of aliases) {
      let sc = 0;
      if (h === a) sc = 100 + a.length;
      else if (a.length >= 3 && h.startsWith(a)) sc = a.length;
      if (sc > score) { score = sc; best = role; }
    }
  }
  return best;
}

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cols = {};
    (rows[i] || []).forEach((c, j) => { const r = roleOf(c); if (r && !(r in cols)) cols[r] = j; });
    if (cols.exercise !== undefined && (cols.sets !== undefined || cols.reps !== undefined)) return { idx: i, cols, minutes: /phut|min/.test(norm(rows[i][cols.rest])) };
  }
  return null;
}

const WD_WORDS = { hai: 0, ba: 1, tu: 2, nam: 3, sau: 4, bay: 5 };
const WD_EN = { mon: 0, monday: 0, tue: 1, tues: 1, tuesday: 1, wed: 2, wednesday: 2, thur: 3, thurs: 3, thursday: 3, fri: 4, friday: 4, sat: 5, saturday: 5, sun: 6, sunday: 6 };
export const WD_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

/** "T2", "Thứ 2", "thu hai", "2", "CN", "Monday" → 0..6 (0 = thứ Hai), không phải thứ trong tuần thì null. */
export function parseWeekday(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = norm(v);
  let m = /^(?:t|thu)?([2-7])$/.exec(n);
  if (m) return Number(m[1]) - 2;
  m = /^thu(hai|ba|tu|nam|sau|bay)$/.exec(n);
  if (m) return WD_WORDS[m[1]];
  if (n === 'cn' || n === 'chunhat') return 6;
  if (n in WD_EN) return WD_EN[n];
  return null;
}

/** Reps: 10, "8-12", "8–12", "8 đến 12", "45s", "40-60 giây". Ô bị Excel tự đổi thành ngày (8-12 → 12/8) cũng khôi phục được. */
export function parseReps(v) {
  if (v instanceof Date) {
    const m = v.getUTCMonth() + 1, d = v.getUTCDate();
    return { reps: [Math.min(m, d), Math.max(m, d)], timed: false, fromDate: true };
  }
  if (typeof v === 'number') return Number.isInteger(v) && v >= 1 && v <= 999 ? { reps: [v, v], timed: false } : null;
  if (typeof v !== 'string') return null;
  let s = v.trim().toLowerCase().replace(/\s+/g, ' ');
  let timed = false;
  if (/\d\s*(s|sec|secs|giay|giây|")$/.test(s)) { timed = true; s = s.replace(/\s*(s|sec|secs|giay|giây|")$/, ''); }
  s = s.replace(/\s*(reps?|lần|lan)$/, '');
  let m = /^(\d+)\s*(?:-|–|—|~|đến|den|to)\s*(\d+)$/.exec(s);
  if (!m) { const one = /^(\d+)$/.exec(s); if (one) m = [null, one[1], one[1]]; }
  if (!m) return null;
  const lo = Number(m[1]), hi = Number(m[2]);
  if (lo < 1 || hi > 999 || lo > hi) return null;
  return { reps: [lo, hi], timed };
}

function parseSets(v) {
  const n = typeof v === 'number' ? v : /^(\d+)/.exec(String(v ?? '').trim())?.[1];
  const x = Number(n);
  return Number.isInteger(x) && x >= 1 && x <= 20 ? x : null;
}

/** Nghỉ: 90, "90s", "1:30", "2 phút", "2m". Trả về số giây hoặc null. */
export function parseRest(v, minutes = false) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') { const sec = Math.round(v * (minutes ? 60 : 1)); return sec >= 0 && sec <= 900 ? sec : null; }
  const s = String(v).trim().toLowerCase();
  let m = /^(\d+):(\d{1,2})$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(\d+(?:[.,]\d+)?)\s*(phút|phut|min|m)$/.exec(s);
  if (m) return Math.round(Number(m[1].replace(',', '.')) * 60);
  m = /^(\d+(?:[.,]\d+)?)\s*(giây|giay|sec|s)?$/.exec(s);
  if (m) { const x = Number(m[1].replace(',', '.')); return Math.round(m[2] ? x : x * (minutes ? 60 : 1)); }
  return null;
}

function parseWeight(v) {
  if (typeof v === 'number') return v >= 0 && v <= 1000 ? v : null;
  const m = /^(\d+(?:[.,]\d+)?)\s*(kg)?$/i.exec(String(v ?? '').trim());
  return m ? Number(m[1].replace(',', '.')) : null;
}

const text = (v) => (v === null || v === undefined ? '' : String(v).trim());
const isEmptyRow = (r) => !r || r.every((c) => c === null || c === undefined || String(c).trim() === '');

/**
 * Biến bảng (mảng 2 chiều) thành chương trình.
 * Trả { days: [{ title, weekday, items }], warnings: [chuỗi], errors: [chuỗi] }.
 * Ô "Ngày"/"Buổi" để trống thì lấy theo dòng phía trên (như khi gộp ô trong Excel).
 */
export function parseRows(rows) {
  const out = { days: [], warnings: [], errors: [] };
  const head = findHeader(rows || []);
  if (!head) {
    out.errors.push('Không tìm thấy dòng tiêu đề. File cần có cột "Bài tập" và cột "Số hiệp" hoặc "Reps" (xem file mẫu).');
    return out;
  }
  const { cols, idx, minutes } = head;
  const cell = (r, role) => (cols[role] === undefined ? null : r[cols[role]]);
  const byKey = new Map();
  let curDay = '', curSession = '';

  for (let i = idx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (isEmptyRow(r)) continue;
    const line = i + 1;
    const dayCell = cell(r, 'day'), sessCell = cell(r, 'session');
    const hasDay = !isEmptyRow([dayCell]), hasSess = !isEmptyRow([sessCell]);
    // Dòng bắt đầu một buổi mới (có ghi Ngày hoặc Buổi) thì không kế thừa cột còn lại từ buổi trước
    if (hasDay) { curDay = dayCell instanceof Date ? '' : text(dayCell); if (!hasSess) curSession = ''; }
    if (hasSess) { curSession = text(sessCell); if (!hasDay) curDay = ''; }
    const name = text(cell(r, 'exercise'));
    if (!name) continue; // dòng chỉ ghi tên buổi/ngày

    const key = `${curDay}|${curSession}`;
    if (!byKey.has(key)) {
      const wd = parseWeekday(curDay);
      const title = curSession || (wd === null ? curDay : WD_LABELS[wd]) || `Buổi ${byKey.size + 1}`;
      byKey.set(key, { title: title.slice(0, 60), weekday: wd, items: [] });
    }
    const day = byKey.get(key);

    const setsRaw = cell(r, 'sets');
    let sets = setsRaw === null || setsRaw === '' ? null : parseSets(setsRaw);
    if (sets === null) { out.warnings.push(`Dòng ${line} (${name}): ${setsRaw === null || setsRaw === '' ? 'chưa có số hiệp' : `không đọc được số hiệp "${text(setsRaw)}"`}, dùng 3 hiệp.`); sets = 3; }

    const repsRaw = cell(r, 'reps');
    let rp = parseReps(repsRaw);
    if (!rp) {
      out.warnings.push(`Dòng ${line} (${name}): ${repsRaw === null || repsRaw === '' ? 'chưa có reps' : `không đọc được reps "${text(repsRaw)}"`}, dùng 8–12.`);
      rp = { reps: [8, 12], timed: false };
    } else if (rp.fromDate) {
      out.warnings.push(`Dòng ${line} (${name}): Excel đã đổi ô Reps thành ngày, mình đọc lại là ${rp.reps[0]}–${rp.reps[1]}. Hãy đặt cột Reps dạng Text (hoặc gõ dấu ' trước 8-12) để khỏi bị đổi.`);
    }

    const restRaw = cell(r, 'rest');
    let rest = parseRest(restRaw, minutes);
    if (rest === null) {
      if (restRaw !== null && restRaw !== '') out.warnings.push(`Dòng ${line} (${name}): không đọc được thời gian nghỉ "${text(restRaw)}", dùng 90 giây.`);
      rest = 90;
    }
    if (rest > 900) { out.warnings.push(`Dòng ${line} (${name}): nghỉ quá 15 phút, đặt lại 900 giây.`); rest = 900; }

    const wRaw = cell(r, 'weight');
    const weight = wRaw === null || wRaw === '' ? null : parseWeight(wRaw);
    if (wRaw !== null && wRaw !== '' && weight === null) out.warnings.push(`Dòng ${line} (${name}): bỏ qua mức tạ "${text(wRaw)}".`);

    const urlRaw = text(cell(r, 'url'));
    const url = /^https?:\/\//i.test(urlRaw) ? urlRaw : null;
    if (urlRaw && !url) out.warnings.push(`Dòng ${line} (${name}): link video phải bắt đầu bằng http hoặc https, đã bỏ qua.`);

    day.items.push({ name: name.slice(0, 80), sets, reps: rp.reps, timed: rp.timed, rest, weight, note: text(cell(r, 'note')).slice(0, 200) || null, url });
  }

  out.days = [...byKey.values()].filter((d) => d.items.length);
  if (!out.days.length) out.errors.push('Không có dòng bài tập nào dưới dòng tiêu đề.');
  if (out.days.length > 14) out.errors.push(`File có ${out.days.length} buổi, tối đa 14 buổi.`);
  for (const d of out.days) if (d.items.length > 40) out.errors.push(`Buổi "${d.title}" có ${d.items.length} bài, tối đa 40 bài.`);
  return out;
}

// ---------- CSV ----------
export function parseCsv(textIn) {
  const src = textIn.replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] || '';
  const delim = [',', ';', '\t'].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// ---------- Đọc file (tải thư viện khi cần để app nhẹ) ----------
const MAX_BYTES = 5 * 1024 * 1024;

export async function readProgramFile(file) {
  if (file.size > MAX_BYTES) throw new Error('File quá lớn (tối đa 5MB)');
  const name = file.name.toLowerCase();
  if (name.endsWith('.xls')) throw new Error('App chưa đọc được file .xls cũ. Hãy mở file trong Excel và lưu lại dạng .xlsx.');
  let result;
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    result = parseRows(parseCsv(await file.text()));
  } else if (name.endsWith('.xlsx')) {
    const { default: readExcelFile } = await import('read-excel-file/universal');
    let sheets;
    try { sheets = await readExcelFile(await file.arrayBuffer()); } catch { throw new Error('Không mở được file này. Hãy chắc chắn đó là file Excel .xlsx hợp lệ.'); }
    // ưu tiên sheet tên "Chương trình", rồi lần lượt các sheet còn lại cho tới khi tìm được bảng bài tập
    const ordered = [...sheets].sort((a, b) => (norm(b.sheet).includes('chuongtrinh') ? 1 : 0) - (norm(a.sheet).includes('chuongtrinh') ? 1 : 0));
    result = null;
    for (const s of ordered) {
      const r = parseRows(s.data);
      if (!r.errors.length || !result) result = r;
      if (!r.errors.length) { result.sheet = s.sheet; break; }
    }
  } else {
    throw new Error('Chỉ nhận file .xlsx hoặc .csv');
  }
  return result;
}

// ---------- Ghi file mẫu / xuất chương trình ----------
const repsText = (it) => (it.reps[0] === it.reps[1] ? String(it.reps[0]) : `${it.reps[0]}-${it.reps[1]}`) + (it.timed ? 's' : '');

/** days: [{ title, weekday, items }] → dữ liệu bảng cho write-excel-file. */
export function toSheetData(days, extraNote = () => null) {
  const bold = (value) => ({ value, fontWeight: 'bold', backgroundColor: '#EDE9FE' });
  const data = [COLUMNS.map(bold)];
  for (const d of days) {
    d.items.forEach((it, i) => {
      data.push([
        i === 0 && d.weekday !== null && d.weekday !== undefined ? WD_LABELS[d.weekday] : null,
        i === 0 ? d.title : null,
        it.name,
        it.sets,
        { value: repsText(it), type: String }, // luôn là chữ để Excel không tự đổi "8-12" thành ngày
        it.rest,
        it.weight ?? null,
        it.note || extraNote(it) || null,
        it.url || null,
      ]);
    });
  }
  return data;
}

export const GUIDE = [
  ['Cách soạn chương trình tập'],
  [''],
  ['1. Mỗi dòng là một bài tập. Các cột: Ngày, Buổi, Bài tập, Số hiệp, Reps, Nghỉ (giây), Tạ (kg), Ghi chú, Link video.'],
  ['2. "Ngày" ghi T2…T7 hoặc CN để app biết hôm nay tập buổi nào. Bỏ trống thì bạn tự chọn buổi khi tập.'],
  ['3. "Buổi" là tên buổi tập, ví dụ Ngực + Tay. Ô Ngày/Buổi chỉ cần ghi ở dòng đầu của buổi, các dòng dưới để trống.'],
  ['4. "Reps" ghi 10 hoặc 8-12. Bài tính giờ ghi 45s hoặc 40-60s (ví dụ plank). Nên đặt cột Reps dạng Text để Excel không đổi 8-12 thành ngày.'],
  ['5. "Nghỉ" tính bằng giây (90, 120…) hoặc ghi 1:30, 2 phút. Bỏ trống thì mặc định 90 giây.'],
  ['6. "Tạ" là mức tạ gợi ý lần đầu (kg). Từ lần sau app tự gợi ý theo lịch sử tập của bạn. Bỏ trống nếu chưa biết.'],
  ['7. Tên bài khớp với thư viện (ví dụ Bench Press, Lat Pulldown) thì app tự thêm gợi ý kỹ thuật và video. Bài khác vẫn tập bình thường.'],
  ['8. Lưu file .xlsx rồi vào app: Thể hình → Tập luyện → Nhập từ Excel.'],
];

export async function downloadProgramXlsx(days, fileName, extraNote) {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const blob = await writeExcelFile([
    { data: toSheetData(days, extraNote), sheet: 'Chương trình', columns: [{ width: 12 }, { width: 18 }, { width: 28 }, { width: 9 }, { width: 10 }, { width: 12 }, { width: 9 }, { width: 38 }, { width: 28 }] },
    { data: GUIDE.map((r, i) => (i === 0 ? [{ value: r[0], fontWeight: 'bold' }] : r)), sheet: 'Hướng dẫn', columns: [{ width: 120 }] },
  ]).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
