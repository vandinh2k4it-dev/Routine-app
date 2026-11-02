# Lịch Thói Quen – web app mobile

Lên lịch hằng ngày (làm việc, học tập, tập gym…): mỗi hoạt động có giờ, ngày lặp lại trong tuần, nhắc nhở trước giờ, tick hoàn thành mỗi ngày, chuỗi ngày liên tiếp và thống kê.

- **frontend/**: React + Vite → Vercel
- **backend/**: Express chạy dạng Vercel Functions → Vercel (project riêng, cùng repo)
- **Database**: Postgres (Neon). Bảng tự tạo ở lần gọi API đầu tiên.

## Chạy thử trên máy
```bash
cd backend && cp .env.example .env   # điền DATABASE_URL, JWT_SECRET
npm install && npm run dev           # http://localhost:4000

cd frontend && cp .env.example .env  # VITE_API_URL=http://localhost:4000
npm install && npm run dev
```

## Deploy
Giống app Sổ Chi Tiêu: tạo 2 project Vercel từ cùng repo (Root Directory `backend` và `frontend`).
Backend cần biến `DATABASE_URL`, `JWT_SECRET` (bắt buộc), `CORS_ORIGIN`. Frontend cần `VITE_API_URL`.

## Nhắc nhở
Hiện nhắc bằng thông báo hệ thống khi app đang mở hoặc chạy nền (kiểm tra mỗi 30 giây). Trên iPhone cần thêm app vào Màn hình chính (iOS 16.4+).
Muốn nhắc cả khi đã tắt hẳn app cần Web Push từ máy chủ (chưa làm).
