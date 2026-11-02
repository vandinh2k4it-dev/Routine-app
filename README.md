# Life OS – quản lý cuộc sống cá nhân mỗi ngày

Web app mobile + desktop để xây kỷ luật: lịch sinh hoạt theo giờ, thói quen, thể hình, TOEIC, công việc freelancer và tổng kết tuần.

| Mục | Chức năng |
|---|---|
| **Tổng quan** | tiến độ hôm nay, việc kế tiếp, streak, gym/TOEIC/công việc/giấc ngủ, biểu đồ tuần |
| **Lịch** | timeline theo giờ, kéo thả dời giờ, lịch tuần, lịch mẫu, sửa hoặc bỏ qua riêng một ngày |
| **Thói quen** | checklist, chuỗi ngày "mềm" (lỡ một ngày không mất chuỗi), lịch tháng, tỉ lệ 7/30 ngày |
| **Thể hình** | ghi buổi tập (hiệp, reps, tạ), progressive overload, số đo cơ thể, **quét phiếu InBody bằng AI**, calories/macro/nước |
| **Chương trình tập** | (trong Thể hình) 5 buổi/tuần có sẵn, mở lên là tập theo từng bài: gợi ý kỹ thuật, video, đồng hồ nghỉ, tự gợi ý tăng tạ, lưu thẳng vào lịch sử |
| **TOEIC** | mục tiêu và đếm ngược, Pomodoro, từ vựng ôn lặp lại, mock test và biểu đồ |
| **Công việc** | dự án, task Todo/Doing/Done, giờ làm, thu nhập freelancer |
| **PT ảo** | trợ lý AI trò chuyện, đọc dữ liệu thật của bạn (buổi tập, số đo, dinh dưỡng, giấc ngủ, thói quen, lịch hôm nay) để tư vấn tập và ăn |
| **Tổng kết tuần** | số liệu tự tính, gợi ý tuần tới, ghi chú và mục tiêu |

- **frontend/**: React + Vite → Vercel
- **backend/**: Express chạy dạng Vercel Functions → Vercel (project riêng, cùng repo)
- **Database**: Postgres (Neon). Bảng tự tạo hoặc tự nâng cấp ở lần gọi API đầu tiên, dữ liệu cũ được giữ nguyên.

## Chạy thử trên máy
```bash
cd backend && cp .env.example .env   # điền DATABASE_URL, JWT_SECRET
npm install && npm run dev           # http://localhost:4000

cd frontend && cp .env.example .env  # VITE_API_URL=http://localhost:4000
npm install && npm run dev
```

## Deploy
Hai project Vercel từ cùng repo (Root Directory `backend` và `frontend`).
- Backend: `DATABASE_URL` (chuỗi Neon pooled), `JWT_SECRET` (bắt buộc), `CORS_ORIGIN` (domain frontend), `GEMINI_API_KEY` hoặc `ANTHROPIC_API_KEY` (tùy chọn: bỏ trống cả hai thì tắt tính năng quét phiếu InBody; có cả hai thì dùng Gemini).
- Frontend: `VITE_API_URL` (địa chỉ backend, không có `/` ở cuối). Đổi biến `VITE_` thì phải build lại.

## Quét phiếu InBody bằng AI
Mục Thể hình → Cơ thể → **Quét phiếu InBody**: chụp phiếu, AI (Gemini hoặc Claude) đọc cân nặng, body fat, khối lượng cơ/mỡ, BMI, mỡ nội tạng, BMR rồi điền sẵn vào form. Bạn đối chiếu với phiếu và bấm Lưu; app không tự lưu. Ảnh chỉ được gửi cho nhà cung cấp AI để đọc, không lưu trong database. Với Gemini gói miễn phí, Google có thể dùng nội dung gửi lên để cải thiện sản phẩm (xem điều khoản Gemini API). Giới hạn 15 lần quét mỗi giờ mỗi người. Đổi model Gemini bằng biến `GEMINI_MODEL`.

## PT ảo
Phát triển → **PT ảo**. Mỗi lần bạn nhắn, server gom dữ liệu gần đây của riêng bạn (21 ngày buổi tập, số đo, 7 ngày dinh dưỡng và giấc ngủ, thói quen, lịch hôm nay, mục tiêu) rồi gửi cùng câu hỏi cho AI (Gemini hoặc Claude). Lịch sử trò chuyện chỉ lưu trên máy bạn, tự xóa khi đăng xuất; server không lưu. Giới hạn 40 tin nhắn mỗi giờ mỗi người. PT ảo không phải bác sĩ; gặp đau hay chấn thương nó sẽ khuyên đi khám.

## Chương trình tập
Thể hình → Tập luyện → **Bắt đầu buổi tập**. Chương trình mẫu "Slim-fit V-taper 5 ngày" (T2–T6; ngực+tay, lưng+vai, chân+bụng, vai+tay, ngực+lưng) nằm trong `frontend/src/program.js`: sửa số hiệp, reps, thời gian nghỉ hoặc thêm bài ở đó. Màn tập đi từng bài, nhập kg và reps rồi tick, đồng hồ nghỉ tự chạy, gợi ý tăng tạ khi lần trước đủ reps tối đa ở mọi hiệp (double progression). Tiến độ buổi đang tập được giữ trên máy, tải lại trang vẫn tiếp tục được. Đây là mẫu khởi đầu dựa trên các nguyên tắc phổ biến, không phải đơn thuốc.

## Tự soạn chương trình tập bằng Excel
Thể hình → Tập luyện → **Nhập từ Excel**. Soạn file .xlsx (hoặc .csv) với các cột **Ngày, Buổi, Bài tập, Số hiệp, Reps, Nghỉ (giây), Tạ (kg), Ghi chú, Link video**, mỗi dòng một bài. Bấm **Tải file mẫu** trong app để có sẵn khung. App đọc file ngay trên máy bạn, cho xem trước và cảnh báo chỗ nào không đọc được, rồi mới lưu. Từ đó mở lên là thấy bài nào, mấy hiệp, bao nhiêu reps, nghỉ bao lâu.
- Ô Ngày/Buổi chỉ cần ghi ở dòng đầu của buổi; dòng dưới để trống. Ngày ghi T2…T7/CN để app biết hôm nay tập buổi nào; bỏ trống thì tự chọn buổi khi tập.
- Reps ghi 10 hoặc 8-12; bài tính giờ ghi 45s hoặc 40-60s. Nên đặt cột Reps dạng Text vì Excel hay tự đổi 8-12 thành ngày (app vẫn đọc lại được và nhắc bạn).
- Tên bài trùng thư viện (Bench Press, Lat Pulldown…) thì có thêm gợi ý kỹ thuật và video; bài khác vẫn tập bình thường.
- Chương trình lưu trong bảng `user_programs` (mỗi người một chương trình). Có thể xuất ra Excel, hoặc quay lại chương trình mẫu bất cứ lúc nào.

## Giới hạn hiện tại
- **Nhắc nhở** chỉ hiện khi app đang mở hoặc chạy nền (kiểm tra mỗi 30 giây). Muốn nhắc khi tắt hẳn app cần Web Push từ máy chủ (chưa làm). Trên iPhone cần thêm app vào Màn hình chính (iOS 16.4+).
- Chưa có ảnh body progress, chưa tích hợp GitHub/portfolio.
- Mục tiêu dinh dưỡng mặc định chỉ để tham khảo, hãy chỉnh theo bản thân (🎯 Mục tiêu).
