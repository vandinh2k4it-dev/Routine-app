// Chương trình tập có sẵn: 5 buổi/tuần (T2–T6), mỗi nhóm cơ ~10–20 hiệp/tuần và tập 2 lần/tuần,
// nhấn mạnh kéo xô + vai bên cho dáng chữ V. Đây là mẫu khởi đầu để chỉnh theo cảm nhận, không phải đơn thuốc.
//
// Mỗi bài: en = tên lưu vào lịch sử (giữ tiếng Anh để biểu đồ progressive overload gom đúng bài),
// vi = tên hiển thị, type: 'compound' | 'isolation', cues = gợi ý kỹ thuật, alt = bài thay thế khi máy bận.

export const EXERCISES = {
  bench: { en: 'Bench Press', vi: 'Đẩy ngực ngang với tạ đòn', muscle: 'Ngực', type: 'compound', cues: ['Ép bả vai xuống và ra sau, ưỡn ngực nhẹ, hai chân đạp chắc xuống sàn', 'Hạ thanh về giữa ngực, khuỷu tay hợp với thân khoảng 45–75°', 'Đẩy lên chắc, không khóa cứng khuỷu ở đỉnh'], alt: ['db_bench'] },
  db_bench: { en: 'Dumbbell Bench Press', vi: 'Đẩy ngực ngang với tạ đơn', muscle: 'Ngực', type: 'compound', cues: ['Hạ tạ chậm tới khi ngực căng, khuỷu hơi chếch khỏi thân', 'Đẩy lên và hơi khép hai tạ lại, không để chạm nhau'], alt: ['bench'] },
  incline_db: { en: 'Incline Dumbbell Press', vi: 'Đẩy ngực trên với tạ đơn', muscle: 'Ngực trên', type: 'compound', cues: ['Ghế nghiêng khoảng 30°, đừng dốc quá', 'Hạ chậm 2–3 giây, cảm nhận ngực trên căng ra', 'Vai vẫn ép xuống, không nhún lên tai'], alt: ['incline_bb', 'chest_press'] },
  incline_bb: { en: 'Incline Barbell Press', vi: 'Đẩy ngực trên với tạ đòn', muscle: 'Ngực trên', type: 'compound', cues: ['Ghế nghiêng khoảng 30°, thanh hạ về phần ngực trên', 'Giữ bả vai ép chặt vào ghế suốt hiệp'], alt: ['incline_db'] },
  chest_press: { en: 'Machine Chest Press', vi: 'Đẩy ngực máy', muscle: 'Ngực', type: 'compound', cues: ['Chỉnh ghế để tay cầm ngang giữa ngực', 'Đẩy ra rồi về chậm, không để tạ chạm nhau giữa các lần'], alt: ['db_bench'] },
  cable_fly: { en: 'Cable Fly', vi: 'Ép ngực cáp', muscle: 'Ngực', type: 'isolation', cues: ['Giữ khuỷu hơi gập, cố định suốt hiệp', 'Ôm hai tay vào như ôm một cái cây, siết ngực ở cuối', 'Không dùng đà từ lưng'], alt: ['pec_deck'] },
  pec_deck: { en: 'Pec Deck', vi: 'Ép ngực máy', muscle: 'Ngực', type: 'isolation', cues: ['Lưng dán vào ghế, vai không nhún', 'Siết ngực ở điểm khép, hạ về chậm'], alt: ['cable_fly'] },
  pushdown: { en: 'Triceps Pushdown', vi: 'Ép tay sau cáp', muscle: 'Tay sau', type: 'isolation', cues: ['Khuỷu tay ép sát thân, chỉ cẳng tay chuyển động', 'Duỗi hết khuỷu rồi siết tay sau 1 giây'], alt: ['skull'] },
  oh_ext: { en: 'Overhead Triceps Extension', vi: 'Duỗi tay sau qua đầu', muscle: 'Tay sau', type: 'isolation', cues: ['Khuỷu tay chỉ lên trần, không xòe ra', 'Hạ sâu để tay sau được kéo giãn rồi duỗi lên'], alt: ['pushdown'] },
  skull: { en: 'Skull Crusher', vi: 'Nằm duỗi tay sau', muscle: 'Tay sau', type: 'isolation', cues: ['Giữ cánh tay trên cố định, chỉ gập khuỷu', 'Hạ thanh về phía trán hoặc sau đầu một chút, kiểm soát chậm'], alt: ['oh_ext'] },
  ez_curl: { en: 'EZ Bar Curl', vi: 'Cuốn tay trước với tạ đòn cong', muscle: 'Tay trước', type: 'isolation', cues: ['Khuỷu cố định phía trước thân, không đưa lưng', 'Hạ chậm 2–3 giây, duỗi gần hết tay'], alt: ['db_curl'] },
  db_curl: { en: 'Dumbbell Curl', vi: 'Cuốn tay trước với tạ đơn', muscle: 'Tay trước', type: 'isolation', cues: ['Vai thả lỏng, không vung người', 'Xoay cổ tay ngửa lên ở nửa trên của chuyển động'], alt: ['ez_curl'] },
  hammer: { en: 'Hammer Curl', vi: 'Cuốn tạ kiểu búa', muscle: 'Tay trước, cẳng tay', type: 'isolation', cues: ['Lòng bàn tay hướng vào nhau suốt hiệp', 'Khuỷu sát thân, không đưa người'], alt: ['db_curl'] },
  incline_curl: { en: 'Incline Dumbbell Curl', vi: 'Cuốn tay trước trên ghế nghiêng', muscle: 'Tay trước', type: 'isolation', cues: ['Ngả lưng vào ghế nghiêng, để tay buông thẳng xuống để kéo giãn', 'Cuốn lên không đưa khuỷu ra trước'], alt: ['db_curl'] },
  cable_curl: { en: 'Cable Curl', vi: 'Cuốn tay trước cáp', muscle: 'Tay trước', type: 'isolation', cues: ['Đứng thẳng, khuỷu sát thân', 'Siết ở đỉnh, hạ chậm'], alt: ['db_curl'] },
  pulldown: { en: 'Lat Pulldown', vi: 'Kéo xô', muscle: 'Lưng xô', type: 'compound', cues: ['Ưỡn ngực, kéo thanh xuống tới xương đòn', 'Nghĩ tới kéo khuỷu xuống phía túi quần, không dùng tay kéo', 'Ngả người rất nhẹ, không giật tạ'], alt: ['pullup'] },
  pullup: { en: 'Pull-up', vi: 'Hít xà', muscle: 'Lưng xô', type: 'compound', cues: ['Bắt đầu từ treo thẳng tay, vai hơi ép xuống', 'Kéo cằm qua xà, khuỷu đi xuống và ra sau', 'Chưa làm được thì dùng máy hỗ trợ hoặc kéo xô'], alt: ['pulldown'] },
  cg_pulldown: { en: 'Close-Grip Lat Pulldown', vi: 'Kéo xô tay hẹp', muscle: 'Lưng xô', type: 'compound', cues: ['Cầm tay hẹp, kéo về giữa ngực', 'Giữ ngực cao, siết lưng ở cuối'], alt: ['pulldown'] },
  seated_row: { en: 'Seated Cable Row', vi: 'Kéo cáp ngồi', muscle: 'Lưng giữa', type: 'compound', cues: ['Lưng thẳng, kéo tay cầm về phía bụng', 'Ép hai bả vai lại ở cuối, không ngả người ra sau để lấy đà'], alt: ['cs_row'] },
  cs_row: { en: 'Chest-Supported Row', vi: 'Kéo tạ nằm sấp ghế nghiêng', muscle: 'Lưng giữa', type: 'compound', cues: ['Ngực tì vào ghế, không dùng đà', 'Kéo khuỷu ra sau, siết bả vai'], alt: ['seated_row'] },
  sa_pulldown: { en: 'Straight-Arm Pulldown', vi: 'Ép xô tay thẳng', muscle: 'Lưng xô', type: 'isolation', cues: ['Tay gần thẳng, kéo thanh xuống tới đùi', 'Cảm nhận lưng xô siết lại, không gập khuỷu nhiều'], alt: ['pulldown'] },
  ohp: { en: 'Overhead Press', vi: 'Đẩy vai với tạ đòn', muscle: 'Vai', type: 'compound', cues: ['Siết bụng và mông, không ưỡn lưng', 'Đẩy thanh thẳng lên qua mặt, đầu hơi lùi rồi vào lại', 'Hạ về xương đòn có kiểm soát'], alt: ['db_press'] },
  db_press: { en: 'Dumbbell Shoulder Press', vi: 'Đẩy vai với tạ đơn', muscle: 'Vai', type: 'compound', cues: ['Siết bụng, không ưỡn lưng', 'Đẩy thẳng lên trên đầu, hạ về ngang tai'], alt: ['ohp'] },
  lateral: { en: 'Dumbbell Lateral Raise', vi: 'Nâng tạ đơn sang hai bên', muscle: 'Vai bên', type: 'isolation', cues: ['Nâng tới ngang vai, khuỷu hơi gập, như đang rót nước từ bình', 'Dùng tạ nhẹ, không vung người lấy đà, hạ chậm', 'Đây là bài chính để vai rộng hơn nên làm sạch từng rep'], alt: ['cable_lateral'] },
  cable_lateral: { en: 'Cable Lateral Raise', vi: 'Nâng vai bên bằng cáp', muscle: 'Vai bên', type: 'isolation', cues: ['Đứng nghiêng người, kéo tay cầm ra ngang', 'Lực căng đều suốt chuyển động, không giật'], alt: ['lateral'] },
  face_pull: { en: 'Face Pull', vi: 'Kéo cáp về mặt', muscle: 'Vai sau', type: 'isolation', cues: ['Kéo dây về ngang mặt, khuỷu cao', 'Bóp bả vai lại, xoay nhẹ ngoài ở cuối'], alt: ['rear_fly'] },
  rear_fly: { en: 'Rear Delt Fly', vi: 'Dang tạ vai sau', muscle: 'Vai sau', type: 'isolation', cues: ['Cúi người hoặc dùng máy, dang tay sang hai bên', 'Khuỷu hơi gập, không dùng đà'], alt: ['face_pull'] },
  squat: { en: 'Back Squat', vi: 'Gánh tạ đòn (squat)', muscle: 'Đùi, mông', type: 'compound', cues: ['Hít sâu, gồng bụng trước khi hạ', 'Đầu gối đi cùng hướng với mũi chân', 'Hạ sâu tới mức giữ được lưng thẳng, đẩy gót chân đứng lên'], alt: ['leg_press'] },
  leg_press: { en: 'Leg Press', vi: 'Đạp đùi máy', muscle: 'Đùi', type: 'compound', cues: ['Lưng và mông dán chặt vào ghế', 'Hạ tới khi đầu gối khoảng 90°, không để mông nhấc lên', 'Không khóa cứng gối ở đỉnh'], alt: ['squat'] },
  rdl: { en: 'Romanian Deadlift', vi: 'Deadlift chân thẳng kiểu Romania', muscle: 'Đùi sau, mông', type: 'compound', cues: ['Đẩy hông ra sau, lưng giữ thẳng', 'Thanh trượt sát đùi, dừng khi đùi sau căng', 'Đứng lên bằng cách đẩy hông ra trước'], alt: ['leg_curl'] },
  leg_curl: { en: 'Leg Curl', vi: 'Gập đùi sau máy', muscle: 'Đùi sau', type: 'isolation', cues: ['Hông dán xuống ghế', 'Gập chậm, hạ về chậm 2–3 giây'], alt: ['rdl'] },
  calf: { en: 'Standing Calf Raise', vi: 'Nhón bắp chân', muscle: 'Bắp chân', type: 'isolation', cues: ['Nhón cao hết cỡ, dừng 1 giây ở đỉnh', 'Hạ sâu để bắp chân được kéo giãn'], alt: [] },
  knee_raise: { en: 'Hanging Knee Raise', vi: 'Treo xà gập gối', muscle: 'Bụng', type: 'isolation', cues: ['Cuốn xương chậu lên, không đung đưa', 'Hạ chậm, kiểm soát'], alt: ['cable_crunch'] },
  cable_crunch: { en: 'Cable Crunch', vi: 'Gập bụng cáp', muscle: 'Bụng', type: 'isolation', cues: ['Quỳ gối, cuốn lưng gập về phía đùi, hông giữ yên', 'Siết bụng ở cuối, thở ra'], alt: ['knee_raise'] },
  plank: { en: 'Plank', vi: 'Plank', muscle: 'Bụng, core', type: 'isolation', cues: ['Người thành một đường thẳng, siết bụng và mông', 'Không võng lưng, thở đều'], alt: [] },
};

const it = (ex, sets, lo, hi, rest) => ({ ex, sets, reps: [lo, hi], rest });

export const PROGRAM = {
  name: 'Slim-fit V-taper 5 ngày',
  note: 'Mỗi nhóm cơ tập 2 buổi/tuần, khoảng 10–20 hiệp/tuần. Đá banh và nghỉ vào T7, CN.',
  days: [
    { idx: 0, title: 'Ngực + Tay', focus: 'Ngực, tay sau, tay trước', items: [it('bench', 4, 6, 8, 150), it('incline_db', 3, 8, 12, 120), it('cable_fly', 3, 12, 15, 75), it('pushdown', 3, 10, 12, 75), it('oh_ext', 3, 10, 12, 75), it('ez_curl', 3, 8, 12, 75), it('hammer', 2, 10, 12, 60)] },
    { idx: 1, title: 'Lưng + Vai', focus: 'Lưng xô (độ rộng) và vai bên', items: [it('pulldown', 4, 8, 12, 120), it('seated_row', 3, 8, 12, 120), it('db_press', 3, 8, 10, 120), it('lateral', 4, 12, 15, 60), it('face_pull', 3, 12, 15, 60), it('sa_pulldown', 2, 12, 15, 60)] },
    { idx: 2, title: 'Chân + Bụng', focus: 'Đùi, mông, bắp chân, bụng', items: [it('squat', 4, 8, 10, 150), it('rdl', 3, 8, 10, 120), it('leg_press', 3, 10, 12, 120), it('leg_curl', 3, 10, 12, 75), it('calf', 4, 10, 15, 60), it('knee_raise', 3, 10, 15, 60), it('plank', 3, 40, 60, 45)] },
    { idx: 3, title: 'Vai + Tay', focus: 'Vai, tay trước, tay sau', items: [it('ohp', 3, 6, 8, 150), it('cable_lateral', 4, 12, 15, 60), it('rear_fly', 3, 12, 15, 60), it('skull', 3, 8, 12, 90), it('incline_curl', 3, 10, 12, 75), it('cable_curl', 2, 12, 15, 60), it('cable_crunch', 3, 12, 15, 60)] },
    { idx: 4, title: 'Ngực + Lưng', focus: 'Ngực trên, lưng xô, lưng giữa', items: [it('incline_bb', 3, 6, 8, 150), it('pullup', 4, 6, 10, 120), it('chest_press', 3, 10, 12, 90), it('cs_row', 3, 8, 12, 90), it('pec_deck', 2, 12, 15, 60), it('cg_pulldown', 2, 10, 12, 75)] },
  ],
};

export const isTimed = (id) => id === 'plank'; // bài thư viện tính bằng giây, không phải reps

// ---------- Khớp tên bài người dùng nhập với thư viện (để có gợi ý kỹ thuật, video, bài thay thế) ----------
// Hai mức khớp: khớp ĐÚNG DẤU trước (phân biệt "tạ đòn" với "tạ đơn"), rồi mới đến khớp bỏ dấu và chỉ khi không gây nhầm lẫn.
const exactName = (t) => String(t || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '');
const normName = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '');
const EXACT_INDEX = new Map();
const LOOSE_INDEX = new Map(); // khóa bỏ dấu -> id, hoặc null nếu nhiều bài cùng khóa (mơ hồ)
for (const [id, e] of Object.entries(EXERCISES)) {
  for (const name of [e.en, e.vi]) {
    EXACT_INDEX.set(exactName(name), id);
    const k = normName(name);
    LOOSE_INDEX.set(k, LOOSE_INDEX.has(k) && LOOSE_INDEX.get(k) !== id ? null : id);
  }
}
const ALIASES = {
  squat: 'squat', barbellsquat: 'squat', benchpress: 'bench', barbellbenchpress: 'bench', inclinebenchpress: 'incline_bb', inclinedumbbellbenchpress: 'incline_db',
  lateralraise: 'lateral', sidelateralraise: 'lateral', dumbbelllateralraise: 'lateral', shoulderpress: 'db_press', militarypress: 'ohp', barbellcurl: 'ez_curl',
  bicepcurl: 'db_curl', bicepscurl: 'db_curl', curl: 'db_curl', pushdown: 'pushdown', tricepspushdown: 'pushdown', calfraise: 'calf', rdl: 'rdl',
  cablerow: 'seated_row', seatedrow: 'seated_row', row: 'seated_row', fly: 'cable_fly', chestfly: 'cable_fly', pullups: 'pullup', chinup: 'pullup',
  pulldown: 'pulldown', latpulldown: 'pulldown',
};
export function matchLibrary(name) {
  const e = exactName(name);
  if (!e) return null;
  if (EXACT_INDEX.has(e)) return EXACT_INDEX.get(e);
  const n = normName(name);
  if (!n) return null;
  if (LOOSE_INDEX.has(n)) return LOOSE_INDEX.get(n); // null nếu mơ hồ
  if (ALIASES[n]) return ALIASES[n];
  let found = null;
  for (const [k, id] of LOOSE_INDEX) {
    if (id && k.length >= 8 && n.includes(k)) { if (found && found !== id) return null; found = id; } // ví dụ "Bench Press (tạ đòn)"
  }
  return found;
}
const guessType = (name) => (/squat|deadlift|press|row|pull|chin|dip|lunge|đẩy|kéo|gánh/i.test(name) ? 'compound' : 'isolation');

const libFields = (id) => {
  const e = EXERCISES[id];
  return { type: e.type, muscle: e.muscle, vi: e.vi, cues: e.cues, alts: e.alt.map((a) => ({ key: a, name: EXERCISES[a].en, vi: EXERCISES[a].vi })), libId: id };
};

/** Một bài của chương trình ở dạng dùng khi tập (cả bản mẫu lẫn bản người dùng nhập đều có cùng dạng này). */
export function itemFromLib(id, t) {
  return { key: id, name: EXERCISES[id].en, ...libFields(id), sets: t.sets, reps: t.reps, rest: t.rest, weight: t.weight ?? null, note: t.note ?? null, url: null, timed: isTimed(id) };
}
export function itemFromCustom(raw) {
  const id = matchLibrary(raw.name);
  const base = id ? libFields(id) : { type: guessType(raw.name), muscle: '', vi: '', cues: [], alts: [], libId: null };
  return { key: id || `c:${normName(raw.name)}`, name: raw.name, ...base, sets: raw.sets, reps: raw.reps, rest: raw.rest ?? 90, weight: raw.weight ?? null, note: raw.note ?? null, url: raw.url ?? null, timed: !!raw.timed || (id ? isTimed(id) : false) };
}

/** custom = chương trình người dùng nhập (hoặc null để dùng bản mẫu). */
export function getProgram(custom) {
  if (custom) {
    return { name: custom.name, custom: true, note: null, updated_at: custom.updated_at, days: custom.days.map((d) => ({ title: d.title, weekday: d.weekday ?? null, focus: '', items: d.items.map(itemFromCustom) })) };
  }
  return {
    name: PROGRAM.name, custom: false, note: PROGRAM.note,
    days: PROGRAM.days.map((d) => ({ title: d.title, weekday: d.idx, focus: d.focus, items: d.items.map((x) => itemFromLib(x.ex, { sets: x.sets, reps: x.reps, rest: x.rest })) })),
  };
}

/** Chỉ số buổi tập ứng với thứ trong tuần (0 = T2), -1 nếu không có. */
export const dayForWeekday = (program, wd) => program.days.findIndex((d) => d.weekday === wd);

/** Ước lượng thời lượng buổi tập (phút): thời gian làm + nghỉ giữa các hiệp, cộng khởi động. */
export function estimateMinutes(day) {
  let sec = 300;
  for (const x of day.items) sec += x.sets * ((x.timed ? x.reps[1] : 45) + x.rest);
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

/** Số hiệp mỗi tuần theo nhóm cơ chính (chỉ tính các bài có trong thư viện). */
export function weeklySets(program) {
  const out = {};
  for (const d of program.days) for (const x of d.items) {
    if (!x.muscle) continue;
    const m = x.muscle.split(',')[0];
    out[m] = (out[m] || 0) + x.sets;
  }
  return out;
}

export const videoUrl = (item) => item.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(item.name + ' proper form')}`;

/**
 * Gợi ý mức tạ theo "double progression": đủ số reps tối đa ở mọi hiệp lần trước thì tăng tạ, chưa đủ thì giữ tạ và cố thêm reps.
 * workouts: danh sách buổi tập (mới nhất trước), mỗi buổi có sets [{ exercise, reps, weight }].
 */
export function suggest(item, workouts) {
  const name = item.name.toLowerCase();
  const w = (workouts || []).find((x) => x.sets.some((s) => s.exercise.toLowerCase() === name));
  if (!w) {
    if (item.weight) return { weight: item.weight, last: null, text: `Mức tạ trong chương trình của bạn: ${item.weight}kg. Chỉnh lại nếu thấy quá nặng hoặc quá nhẹ.` };
    return { weight: '', last: null, text: 'Lần đầu với bài này: chọn mức tạ nhẹ để làm quen kỹ thuật, dừng khi còn dư 2–3 reps.' };
  }
  const last = w.sets.filter((s) => s.exercise.toLowerCase() === name);
  const base = Math.max(...last.map((s) => s.weight));
  const top = item.reps[1];
  const hitAll = last.length >= Math.min(item.sets, 2) && last.every((s) => s.reps >= top);
  const step = item.type === 'compound' ? 2.5 : 1;
  if (item.timed || base === 0) return { weight: base || '', last, text: item.timed ? 'Cố giữ lâu hơn lần trước.' : 'Ghi mức tạ lần này để app gợi ý tăng dần.' };
  if (hitAll) return { weight: base + step, last, text: `Lần trước đủ ${top} reps ở mọi hiệp, thử tăng lên ${base + step}kg.` };
  return { weight: base, last, text: `Giữ ${base}kg và cố thêm 1 rep mỗi hiệp, đủ ${top} reps ở mọi hiệp thì tăng tạ.` };
}

// ---------- Buổi đang tập dở (lưu trên máy) ----------
export const SESSION_KEY = 'cache:session';
export const sessionSig = (program, day) => `${program.name}|${day.title}|${day.items.length}`;
export function hasSession(program, dayIdx, today) {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    const d = program.days[dayIdx];
    return !!(s && d && s.v === 2 && s.date === today && s.sig === sessionSig(program, d));
  } catch { return false; }
}

// Ảnh minh họa 2 tư thế (đầu/cuối) từ free-exercise-db (public domain), khóa theo id thư viện
const DEMO_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const DEMO = {
  bench: 'Barbell_Bench_Press_-_Medium_Grip', db_bench: 'Dumbbell_Bench_Press', incline_db: 'Incline_Dumbbell_Press', incline_bb: 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  chest_press: 'Leverage_Chest_Press', cable_fly: 'Cable_Crossover', pec_deck: 'Butterfly', pushdown: 'Triceps_Pushdown', oh_ext: 'Cable_Rope_Overhead_Triceps_Extension',
  skull: 'EZ-Bar_Skullcrusher', ez_curl: 'EZ-Bar_Curl', db_curl: 'Dumbbell_Bicep_Curl', hammer: 'Hammer_Curls', incline_curl: 'Incline_Dumbbell_Curl',
  cable_curl: 'Standing_Biceps_Cable_Curl', pulldown: 'Wide-Grip_Lat_Pulldown', pullup: 'Pullups', cg_pulldown: 'Close-Grip_Front_Lat_Pulldown',
  seated_row: 'Seated_Cable_Rows', cs_row: 'Incline_Bench_Pull', sa_pulldown: 'Straight-Arm_Pulldown', ohp: 'Standing_Military_Press', db_press: 'Dumbbell_Shoulder_Press',
  lateral: 'Side_Lateral_Raise', cable_lateral: 'Cable_Seated_Lateral_Raise', face_pull: 'Face_Pull', rear_fly: 'Reverse_Flyes', squat: 'Barbell_Squat',
  leg_press: 'Leg_Press', rdl: 'Romanian_Deadlift', leg_curl: 'Lying_Leg_Curls', calf: 'Standing_Calf_Raises', knee_raise: 'Hanging_Leg_Raise',
  cable_crunch: 'Cable_Crunch', plank: 'Plank',
};
/** [ảnh tư thế đầu, ảnh tư thế cuối] hoặc null nếu bài không có trong thư viện. */
export const demoImages = (item) => (item.libId && DEMO[item.libId] ? [0, 1].map((n) => `${DEMO_BASE}${DEMO[item.libId]}/${n}.jpg`) : null);
