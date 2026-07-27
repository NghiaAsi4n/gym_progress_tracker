# Gym Progress Tracker

Ứng dụng theo dõi tập gym gồm React/Vite, Express và MongoDB. Workspace yêu cầu Node.js 24+, npm 11+ và Docker.

## Chạy local

```powershell
Copy-Item .env.example .env
docker compose up -d
npm install
npm run seed
npm run dev
```

Web chạy tại `http://localhost:5173`, API tại `http://localhost:4000/api/v1`.

Tài khoản demo:

- Email: `demo@gym.local`
- Mật khẩu: `DemoPassword1!`

Seed có thể chạy lại mà không nhân bản dữ liệu và sẽ từ chối chạy khi `NODE_ENV=production`. Các secret trong `.env.example` chỉ dành cho local; phải thay bằng giá trị ngẫu nhiên riêng khi triển khai.

## Lệnh chính

| Lệnh                | Mục đích                                        |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Chạy contracts, API và web ở chế độ development |
| `npm run seed`      | Seed system exercises và dữ liệu demo           |
| `npm run lint`      | Kiểm tra ESLint                                 |
| `npm run typecheck` | Kiểm tra TypeScript                             |
| `npm run build`     | Build toàn workspace                            |

MongoDB local được lưu trong Docker volume `mongodb_data`. Dừng service bằng `docker compose down`.

## Cấu trúc

- `apps/api`: Express API, xác thực JWT/refresh cookie và MongoDB models.
- `apps/web`: React SPA, responsive UI, theme sáng/tối và i18n Việt/Anh.
- `packages/contracts`: Zod schemas và kiểu dữ liệu dùng chung giữa API/web.

API giới hạn kích thước request, query và tần suất gọi; CORS/Origin chỉ chấp nhận `WEB_ORIGIN`. Không log password, token hoặc cookie.

`npm audit` hiện báo advisory React Router liên quan riêng đến RSC action handling. Web app này là Vite SPA, không bật RSC/server actions; không hạ phiên bản vì các bản cũ có advisory ảnh hưởng client routing.
