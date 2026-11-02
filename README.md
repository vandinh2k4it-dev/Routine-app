# Life OS – quản lý cuộc sống cá nhân mỗi ngày

Web app mobile + desktop để xây kỷ luật: lịch sinh hoạt theo giờ, thói quen, thể hình, TOEIC, công việc freelancer và tổng kết tuần.

| Mục | Chức năng |
|---|---|
| **Tổng quan** | tiến độ hôm nay, việc kế tiếp, streak, gym/TOEIC/công việc/giấc ngủ, biểu đồ tuần |
| **Lịch** | timeline theo giờ, kéo thả dời giờ, lịch tuần, lịch mẫu, sửa hoặc bỏ qua riêng một ngày |
| **Thói quen** | checklist, chuỗi ngày "mềm" (lỡ một ngày không mất chuỗi), lịch tháng, tỉ lệ 7/30 ngày |
| **Thể hình** | ghi buổi tập (hiệp, reps, tạ), progressive overload, cân nặng và số đo, calories/macro/nước |
| **TOEIC** | mục tiêu và đếm ngược, Pomodoro, từ vựng ôn lặp lại, mock test và biểu đồ |
| **Công việc** | dự án, task Todo/Doing/Done, giờ làm, thu nhập freelancer |
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
- Backend: `DATABASE_URL` (chuỗi Neon pooled), `JWT_SECRET` (bắt buộc), `CORS_ORIGIN` (domain frontend).
- Frontend: `VITE_API_URL` (địa chỉ backend, không có `/` ở cuối). Đổi biến `VITE_` thì phải build lại.

## Giới hạn hiện tại
- **Nhắc nhở** chỉ hiện khi app đang mở hoặc chạy nền (kiểm tra mỗi 30 giây). Muốn nhắc khi tắt hẳn app cần Web Push từ máy chủ (chưa làm). Trên iPhone cần thêm app vào Màn hình chính (iOS 16.4+).
- Chưa có ảnh body progress, chưa tích hợp GitHub/portfolio.
- Mục tiêu dinh dưỡng mặc định chỉ để tham khảo, hãy chỉnh theo bản thân (🎯 Mục tiêu).
