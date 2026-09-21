# Task 001: Khởi tạo Project theo Next.js Monorepo

## 1. Mục tiêu
- Thiết lập và khởi tạo cấu trúc dự án cơ sở cho `music-shop` theo kiến trúc thống nhất (Frontend & API: Next.js/React + TypeScript + Tailwind CSS với Route Handlers, Database: PostgreSQL + Prisma ORM, Storage: S3-compatible Cloudflare R2 / AWS S3, Container: Docker).
- Đảm bảo các công cụ quản lý chất lượng mã nguồn (Linter, Formatter, TypeScript compiler) và kịch bản khởi chạy sẵn sàng hoạt động.

## 2. Đọc trước (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Database Schema](../architecture/database-schema.md)
- [CLAUDE.md](../../CLAUDE.md)

## 3. Phạm vi
- Khởi tạo cấu trúc các thư mục mã nguồn:
  - `src/`: Cấu hình dự án Next.js (TypeScript, Tailwind CSS, App Router & API Route Handlers).
  - `src/db/migrations/`: Khởi tạo môi trường ORM và file migration ban đầu.
  - `test/`: Cấu hình test runner (Jest / Vitest).
  - `build/deploy/`: Hoàn thiện `Dockerfile`, `docker-compose.yml`, và `.github/workflows/ci.yml`.
  - `tools/`: Các script hỗ trợ phát triển.
- Cấu hình biến môi trường chuẩn mẫu `.env.example` và thiết lập `.gitignore`.
- Tuyệt đối KHÔNG viết mã xử lý nghiệp vụ hay tính năng chi tiết của ứng dụng trong task này.

## 4. Tiêu chí hoàn thành
- [ ] Khởi tạo thành công cấu trúc thư mục sạch sẽ theo đúng thiết kế.
- [ ] Cài đặt đầy đủ dependencies cơ bản cho ứng dụng Next.js.
- [ ] Chạy được `docker compose up` khởi động cơ sở dữ liệu PostgreSQL cục bộ.
- [ ] Chạy được lệnh kiểm tra mã nguồn (lint / type-check / build check) thành công.
- [ ] Không có lỗi biên dịch hoặc xung đột cấu hình môi trường.

## 5. Test cần có
- [ ] Test kiểm tra cấu trúc thư mục và tính sẵn sàng của file cấu hình.
- [ ] Smoke test / Health check endpoint đơn giản (`GET /api/health` trả về status 200 OK).
