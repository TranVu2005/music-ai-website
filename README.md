# music-shop

Website thương mại điện tử chuyên biệt để bán các bản nhạc sáng tác có sẵn (cho phép nghe thử bản preview có watermark, thanh toán trực tuyến qua QR chuyển khoản, cấp quyền tải file gốc bảo mật) và tiếp nhận / quản lý quy trình đặt sáng tác âm nhạc theo yêu cầu riêng.

## Cấu trúc Thư mục

```text
music-shop/
├── docs/                               # Tài liệu dự án theo phương pháp docs-first
│   ├── requirements/                   # Tài liệu yêu cầu chức năng & phi chức năng
│   │   └── requirements.md             # Đặc tả yêu cầu chi tiết
│   ├── architecture/                   # Thiết kế kiến trúc kỹ thuật
│   │   ├── overview.md                 # Tổng quan kiến trúc & các module
│   │   ├── database-schema.md          # Thiết kế bảng & trường cơ sở dữ liệu
│   │   ├── payment-flow.md             # Luồng thanh toán QR & xử lý webhook idempotency
│   │   └── file-protection.md          # Cơ chế bảo vệ file gốc & watermark preview
│   └── tasks/                          # Kế hoạch thực hiện theo từng task cụ thể
│       ├── _template.md                # Bản mẫu (template) chuẩn cho từng task
│       └── 001-project-setup.md        # Task khởi tạo dự án theo [STACK]
├── src/                                # Mã nguồn ứng dụng
│   ├── frontend/                       # Giao diện người dùng (Next.js / React)
│   ├── backend/                        # API backend service (Node.js / Express / Fastify)
│   └── db/                             # Cơ sở dữ liệu
│       └── migrations/                 # Các bản script database migration
├── test/                               # Bộ kiểm thử tự động (Unit, Integration, E2E)
├── build/deploy/                       # Cấu hình đóng gói container và triển khai
│   ├── Dockerfile                      # Khung Dockerfile build multi-stage
│   ├── docker-compose.yml              # Khởi chạy dịch vụ container cục bộ
│   └── .github/workflows/ci.yml        # Kịch bản CI tự động hóa kiểm thử và build
└── tools/                              # Các kịch bản công cụ hỗ trợ phát triển dự án
```

## Nguyên tắc Phát triển (Docs-first)

Dự án áp dụng chặt chẽ quy trình **Docs-First**:
1. Trước khi viết mã, lập trình viên và trợ lý AI luôn phải đọc kỹ tài liệu trong `docs/architecture/` và task cụ thể trong `docs/tasks/`.
2. Chi tiết hướng dẫn và nguyên tắc làm việc xem tại file [CLAUDE.md](./CLAUDE.md).

## Khởi động Nhanh

1. Sao chép file cấu hình môi trường:
   ```bash
   cp .env.example .env
   ```
2. Cập nhật các thông số cần thiết trong file `.env`.
3. Xem hướng dẫn thực hiện khởi tạo dự án tại [Task 001](./docs/tasks/001-project-setup.md).
