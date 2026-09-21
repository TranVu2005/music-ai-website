# Tổng quan Kiến trúc Hệ thống (Architecture Overview)

## 1. Module
- TODO: Module Auth & User Management: Đăng ký, đăng nhập, quản lý phiên làm việc và phân quyền (Khách, Khách hàng đã mua, Quản trị viên).
- TODO: Module Track Catalog & Audio Streaming: Quản lý danh mục bài hát, tìm kiếm/lọc (thể loại, tâm trạng, nhịp điệu) và phát bản nghe thử (preview có watermark).
- TODO: Module Cart & Orders: Quản lý giỏ hàng, tạo đơn hàng, quản lý trạng thái thanh toán và khóa tạm thời bài hát độc quyền.
- TODO: Module Payment & Webhook Integration: Tích hợp cổng thanh toán (QR chuyển khoản), tiếp nhận webhook xác nhận tiền về và đảm bảo xử lý idempotency.
- TODO: Module File Protection & Delivery: Lưu trữ file gốc an toàn trên Object Storage, sinh Signed URL tải nhạc có thời hạn, tự động xuất hóa đơn / giấy phép PDF.
- TODO: Module Custom Request Workflow: Quy trình đặt sáng tác riêng từ gửi brief, báo giá, đặt cọc, gửi bản nghe thử, chỉnh sửa đến nghiệm thu và giao file.
- TODO: Module Admin Dashboard: Trang quản trị đăng tải nhạc mới, cấu hình giá/license, duyệt yêu cầu sáng tác và thống kê doanh thu.

## 2. Công nghệ
- TODO: Định hình cụ thể theo [STACK]:
  - Frontend: Framework hiện đại (Next.js / React, TypeScript, Tailwind CSS).
  - Backend: Node.js (TypeScript, Express / Fastify) phục vụ RESTful API và xử lý audio.
  - Database: PostgreSQL kết hợp ORM (Prisma / Drizzle) cho quản lý quan hệ và migrations.
  - Storage: S3-compatible Object Storage (AWS S3 / Cloudflare R2 / MinIO) cho lưu trữ file gốc và file preview.
  - Deployment & CI/CD: Docker, Docker Compose và GitHub Actions CI.

## 3. Sơ đồ luồng dữ liệu
- TODO: Luồng dữ liệu duyệt kho nhạc và nghe thử:
  - Client -> Backend API -> DB (Metadata bài hát) -> Client nhận danh sách.
  - Client -> Audio Player -> CDN / Object Storage (File preview watermark) -> Phát nhạc trên trình duyệt.
- TODO: Luồng dữ liệu mua nhạc và giao file:
  - Client -> Tạo Order -> Backend tạo giao dịch & tạm khóa bài độc quyền.
  - Cổng thanh toán -> Webhook -> Backend xác thực chữ ký -> Cập nhật trạng thái Order = PAID.
  - Client -> Yêu cầu tải file -> Backend kiểm tra Order hợp lệ -> Sinh Signed URL có hạn (TTL) -> Client tải trực tiếp từ Private Storage.
- TODO: Luồng dữ liệu đặt sáng tác riêng:
  - Khách gửi yêu cầu -> Admin tiếp nhận & gửi báo giá -> Khách đặt cọc -> Admin upload demo -> Khách phản hồi -> Thanh toán tất toán -> Bàn giao file master.
