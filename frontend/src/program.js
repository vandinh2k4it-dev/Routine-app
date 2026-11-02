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

export const dayForWeekday = (wd) => PROGRAM.days.find((d) => d.idx === wd) || null;
export const exOf = (id) => EXERCISES[id];
export const isTimed = (ex) => ex === 'plank'; // tính bằng giây, không phải reps

/** Ước lượng thời lượng buổi tập (phút): thời gian làm + nghỉ giữa các hiệp, cộng khởi động. */
export function estimateMinutes(day) {
  let sec = 300;
  for (const x of day.items) sec += x.sets * (45 + x.rest);
  return Math.round(sec / 60 / 5) * 5;
}

/** Số hiệp mỗi tuần theo nhóm cơ chính (để hiển thị tổng khối lượng). */
export function weeklySets() {
  const out = {};
  for (const d of PROGRAM.days) for (const x of d.items) {
    const m = EXERCISES[x.ex].muscle.split(',')[0];
    out[m] = (out[m] || 0) + x.sets;
  }
  return out;
}

export const videoUrl = (ex) => `https://www.youtube.com/results?search_query=${encodeURIComponent(EXERCISES[ex].en + ' proper form')}`;

/**
 * Gợi ý mức tạ theo "double progression": đủ số reps tối đa ở mọi hiệp lần trước thì tăng tạ, chưa đủ thì giữ tạ và cố thêm reps.
 * workouts: danh sách buổi tập (mới nhất trước), mỗi buổi có sets [{ exercise, reps, weight }].
 */
export function suggest(exId, item, workouts) {
  const name = EXERCISES[exId].en.toLowerCase();
  const w = (workouts || []).find((x) => x.sets.some((s) => s.exercise.toLowerCase() === name));
  if (!w) return { weight: '', last: null, text: 'Lần đầu với bài này: chọn mức tạ nhẹ để làm quen kỹ thuật, dừng khi còn dư 2–3 reps.' };
  const last = w.sets.filter((s) => s.exercise.toLowerCase() === name);
  const base = Math.max(...last.map((s) => s.weight));
  const top = item.reps[1];
  const hitAll = last.length >= Math.min(item.sets, 2) && last.every((s) => s.reps >= top);
  const step = EXERCISES[exId].type === 'compound' ? 2.5 : 1;
  if (isTimed(exId) || base === 0) return { weight: base || '', last, text: 'Cố giữ lâu hơn lần trước.' };
  if (hitAll) return { weight: base + step, last, text: `Lần trước đủ ${top} reps ở mọi hiệp, thử tăng lên ${base + step}kg.` };
  return { weight: base, last, text: `Giữ ${base}kg và cố thêm 1 rep mỗi hiệp, đủ ${top} reps ở mọi hiệp thì tăng tạ.` };
}
