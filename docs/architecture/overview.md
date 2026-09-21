# Tổng quan Kiến trúc Hệ thống (Architecture Overview)

> **Tài liệu nguồn chuẩn**: Đối chiếu và tuân thủ tuyệt đối [Kế hoạch triển khai](../project-plan.md).  
> **Phạm vi dự án được đóng băng ở đúng 13 tính năng chia theo tỷ lệ 5 / 4 / 4 qua 3 giai đoạn.**

---

## 1. Phân rã Module Chức năng theo Giai đoạn

Hệ thống được thiết kế theo cấu trúc modular liền mạch, triển khai dần qua 3 giai đoạn:

### Giai đoạn 1 (Phase 1 - Bản thử) [5 tính năng]
- **Module Presentation & Static Pages [Phase 1]**: Cung cấp giao diện Trang chủ, Giới thiệu nghệ sĩ, Thông tin liên hệ và Bảng giá niêm yết (bài có sẵn & gói đặt riêng).
- **Module Track Catalog & Audio Streaming [Phase 1]**:
  - Quản lý danh mục bài hát công khai.
  - Tìm kiếm toàn văn theo tên bài hát và mô tả.
  - Bộ lọc danh mục theo Thể loại (Genre) và Tâm trạng (Mood).
  - Lưu trữ và hiển thị chỉ số BPM dưới dạng metadata tham khảo cho người nghe (không dùng làm bộ lọc).
  - Trình phát âm thanh (Audio Streaming) phát bản nghe thử MP3 nén (128kbps) có chèn voice watermark định kỳ. File preview trong Phase 1 có thể lưu trữ tạm trong thư mục `public/audio`.
- **Module Custom Request Form [Phase 1]**: Tiếp nhận form thông tin yêu cầu đặt nhạc của khách hàng và tự động gửi email thông báo trực tiếp đến hộp thư chủ website qua `EmailProvider` (tích hợp dịch vụ Resend; chưa có trang quản trị ở Phase 1).

### Giai đoạn 2 (Phase 2 - Bản bán được) [4 tính năng]
- **Module Cart & Orders [Phase 2]**:
  - Giỏ hàng cho phép chọn nhiều bài hát (`orders` và `order_items`). Mỗi bài trong đơn gắn với một loại giấy phép cụ thể (`standard` hoặc `exclusive`).
  - Quản lý trạng thái đơn hàng: `pending`, `paid`, `expired`, `cancelled`, `refunded`.
  - Cơ chế tạm khóa bài hát độc quyền: Tự động chuyển trạng thái bài độc quyền sang `reserved` với hạn giữ chỗ mặc định 60 phút (`settings.hold_minutes = 60`).
  - Hỗ trợ hành động khách hàng "Tôi đã chuyển tiền" (`orders.paid_claimed_at`), tự động gia hạn thời gian giữ chỗ lên `settings.claimed_hold_hours` (mặc định 24 giờ) và gửi email thông báo chủ website đối soát.
  - Giải phóng toàn bộ bài độc quyền về `published` đồng thời khi đơn hết hạn hoặc bị hủy.
- **Module Payment & Confirmation [Phase 2]**:
  - Tích hợp thanh toán quét mã VietQR: Tự động sinh chuỗi mã hóa chuẩn EMVCo cục bộ (không phụ thuộc bên thứ ba), nội dung chuyển khoản chuẩn hóa là `order_code`.
  - Cơ chế xác nhận thanh toán thủ công: Chủ website kiểm tra tài khoản ngân hàng và thực hiện thao tác "Xác nhận đã nhận tiền" (Confirm payment received) trên trang quản trị.
  - Đảm bảo tính toàn vẹn giao dịch và phòng tránh deadlock (Deadlock Avoidance): Mọi thao tác xác nhận/giữ chỗ/giải phóng đều thực thi trong một Database Transaction duy nhất, khóa bản ghi `orders` trước, sau đó khóa các bản ghi `tracks` theo thứ tự `ORDER BY id ASC FOR UPDATE`.
  - Xử lý đơn hàng đã hết hạn (`EXPIRED`): Re-check tính khả dụng của bài độc quyền khi admin bấm xác nhận. Nếu bài độc quyền đã bị mua/giữ bởi đơn khác, hệ thống từ chối toàn bộ đơn hàng, giữ đơn ở `EXPIRED` và thiết lập cột boolean `orders.needs_refund = true` cho 100% số tiền đơn hàng.
  - Thiết kế sẵn trừu tượng hóa qua `PaymentProvider` interface để sẵn sàng cắm thêm adapter webhook tự động trong tương lai mà không làm thay đổi core business logic.
- **Module File Protection & Delivery [Phase 2]**:
  - Lưu trữ an toàn file master chất lượng cao (WAV 24-bit / FLAC) trong Private Object Storage (Cloudflare R2 hoặc AWS S3). Tuyệt đối không commit file master vào repo hoặc để trong `public/`.
  - Khi đơn hàng `PAID`, gửi email kèm đường dẫn chứa mã truy cập đơn hàng an toàn (`download_token` trên bảng `orders`, hiệu lực `settings.download_valid_days`, mặc định 30 ngày).
  - Khi khách hàng truy cập link tải, endpoint ứng dụng xác thực đơn hàng và cấp Pre-signed URL tải trực tiếp có thời hạn ngắn (15 - 30 phút).
  - Quản lý lượt tải và ghi log bảo mật chi tiết theo từng `order_item_id` vào bảng `download_logs`.
- **Module Admin Dashboard [Phase 2]**: Trang quản trị dành riêng cho chủ website để đăng bài hát mới, cập nhật giá và license, quản lý danh sách đơn hàng (hỗ trợ lọc theo `needs_refund`), xác nhận thanh toán thủ công và cấu hình tham số hệ thống (`hold_minutes`, `claimed_hold_hours`, `download_valid_days`).

### Giai đoạn 3 (Phase 3 - Bản đầy đủ) [4 tính năng]
- **Module Custom Request Workflow [Phase 3]**: Quản lý quy trình sáng tác riêng khép kín trực tiếp trên hệ thống: Tiếp nhận yêu cầu -> Báo giá (thực hiện snapshot `deposit_percent` và `revision_limit` từ `settings` sang bản ghi `custom_requests`) -> Khách đặt cọc -> Tải bản nghe thử demo -> Tiếp nhận phản hồi chỉnh sửa (theo dõi lịch sử qua `custom_request_revisions`, giới hạn `revision_limit`) -> Khách thanh toán phần còn lại -> Bàn giao file master và giấy phép.
- **Module Customer Accounts [Phase 3]**: Khách hàng đăng ký, đăng nhập tài khoản an toàn; xem lại danh sách đơn hàng đã mua, link tải file còn hạn và theo dõi các đơn đặt sáng tác riêng.
- **Module Reviews [Phase 3]**: Hệ thống đánh giá xếp hạng sao (1 đến 5 sao) và bình luận phản hồi cho từng bài hát; chỉ cho phép người mua thực tế (`order_item` đã thanh toán thành công) được quyền để lại đánh giá.
- **Module License PDF Generator [Phase 3]**: Tự động sinh file giấy phép bản quyền PDF cho từng bài hát (`order_item`) trong đơn hàng thành công, lưu trữ trên Object Storage và đính kèm link tải cho khách hàng.

---

## 2. Công nghệ Cốt lõi (Tech Stack)

Hệ thống được chuẩn hóa theo kiến trúc Monorepo thống nhất, tinh giản tối đa hạ tầng vận hành:

- **Fullstack Web Framework**: Next.js (TypeScript, App Router) kết hợp Tailwind CSS cho giao diện người dùng và Next.js Route Handlers (`src/app/api/...`) thay thế cho kiến trúc tách biệt backend server.
- **Cơ sở dữ liệu**: PostgreSQL kết hợp Prisma ORM quản lý mô hình dữ liệu, quan hệ bảng và database migrations.
- **Lưu trữ đối tượng (Object Storage)**: Cloudflare R2 (hoặc AWS S3) tương thích chuẩn S3 API.
  - **Public Bucket / CDN**: Lưu trữ ảnh bìa (cover image) và bản nghe thử MP3 nén (preview audio watermark).
  - **Private Bucket**: Lưu trữ an toàn tuyệt đối file master gốc (WAV/FLAC) và file giấy phép PDF đã tạo.
- **Xử lý âm thanh (Audio Processing)**: FFmpeg chạy dưới dạng script/worker nội bộ trong cùng repository (CLI script / Node.js background worker) để tự động nén âm thanh và chèn voice watermark vào file preview khi bài hát mới được upload.
- **Dịch vụ Email (Email Delivery)**: Sử dụng dịch vụ **Resend** được bọc sau interface `EmailProvider` để trừu tượng hóa việc gửi email thông báo đơn hàng, xác nhận thanh toán và thông báo yêu cầu sáng tác.
- **Container hóa & CI/CD**: Docker, Docker Compose cho môi trường phát triển cục bộ và GitHub Actions cho kiểm thử tự động (CI).

---

## 3. Sơ đồ Luồng Dữ liệu Chính (Data Flows)

### 3.1. Luồng duyệt kho nhạc và nghe thử [Phase 1]
```
Client (Browser/Mobile)
  │
  ├── 1. GET /api/tracks?genre=...&mood=...&q=... ──> Next.js Route Handler ──> PostgreSQL
  │                                                                                  │
  │   <── Trả về danh sách metadata (Tiêu đề, Giá, BPM tham khảo, Cover URL) <──────┘
  │
  └── 2. Phát nhạc Audio Player ──> CDN / Cloudflare R2 Public hoặc /public/audio (File MP3 Watermark)
```

### 3.2. Luồng mua nhạc, thanh toán thủ công và giao file [Phase 2]
```
[1. Tạo đơn hàng]
Khách hàng ──> POST /api/orders (chọn các track + license)
            │
            └──> Next.js Route Handler:
                    - Tạo Order & OrderItems
                    - Khóa các bài độc quyền: status = 'reserved', reserved_until = now() + 60 phút
                    - Trả về mã VietQR (chuỗi EMVCo sinh nội bộ) kèm order_code

[1b. Khách tùy chọn báo đã chuyển tiền]
Khách hàng ──> POST /api/orders/:id/claim-paid
            │
            └──> Cập nhật orders.paid_claimed_at = now()
                 Gia hạn reserved_until = now() + 24 giờ (claimed_hold_hours)
                 Gửi email thông báo cho chủ shop qua Resend

[2. Thanh toán & Xác nhận]
Khách hàng ──> Quét mã VietQR chuyển khoản vào tài khoản ngân hàng chủ shop
Chủ shop   ──> Kiểm tra số dư tài khoản ngân hàng
            │
            └──> Bấm "Xác nhận đã nhận tiền" trên Trang Quản Trị (Admin Panel)
                    │
                    └──> POST /api/admin/orders/:id/confirm-payment
                            - Bắt đầu Transaction có Row-level lock:
                              1. Khóa orders WHERE id = $1 FOR UPDATE
                              2. Khóa tracks liên quan ORDER BY id ASC FOR UPDATE (tránh deadlock)
                            - Kiểm tra: Nếu đơn EXPIRED -> Re-check bài độc quyền còn trống không?
                              + Nếu bài độc quyền đã mất -> từ chối toàn bộ đơn, đặt needs_refund = true (100% tiền)
                              + Nếu bài độc quyền còn trống -> tiếp tục kích hoạt đơn
                            - Cập nhật Order: status = 'paid'
                            - Cập nhật Tracks độc quyền: status = 'sold_exclusive'
                            - Sinh download_token trên orders (hạn download_valid_days)
                            - Tạo bản ghi Payments: confirmed_by, confirmed_at
                            - Gửi email thông báo thanh toán thành công kèm link tải file (qua Resend)

[3. Khách hàng nhận file]
Khách hàng ──> Click link tải trong email: GET /api/downloads/:downloadToken
            │
            └──> Next.js Route Handler:
                    - Kiểm tra hợp lệ của token & thời hạn download_expires_at
                    - Kiểm tra Order đã PAID
                    - Ghi nhận lịch sử vào download_logs theo từng order_item_id & tăng download_count
                    - Sinh Pre-signed URL R2/S3 (TTL 15 - 30 phút, Content-Disposition: attachment)
                    - 302 Redirect khách hàng tải trực tiếp file master từ Private Object Storage
```

### 3.3. Luồng quy trình đặt sáng tác riêng [Phase 1 & Phase 3]
- **Phase 1**: Khách gửi form -> Next.js Route Handler gửi email thông báo về hộp thư cá nhân của chủ website qua `EmailProvider` (Resend) -> Chủ website trao đổi trực tiếp qua email với khách.
- **Phase 3 (Khép kín)**:
```
Khách hàng (Tài khoản) ──> Gửi yêu cầu đặt sáng tác (Brief, style, duration) ──> custom_requests
                                                                                       │
Chủ shop / Nhạc sĩ     ──> Nhập báo giá (quoted_price); hệ thống snapshot <────────────┘
                                `deposit_percent` & `revision_limit` từ settings
                                │
Khách hàng             ──> Đồng ý báo giá, thanh toán đặt cọc (deposit_amount) qua VietQR
                                │
Chủ shop               ──> Xác nhận tiền cọc -> Tiến hành sáng tác -> Tải demo lên hệ thống
                                │
Khách hàng             ──> Nghe demo, gửi góp ý chỉnh sửa (custom_request_revisions)
                                │  (Lặp lại trong giới hạn snapshot revision_limit)
Khách hàng             ──> Duyệt demo cuối cùng -> Thanh toán số tiền còn lại (final payment)
                                │
Chủ shop               ──> Xác nhận thanh toán cuối -> Hệ thống bàn giao file master + Giấy phép PDF
```
