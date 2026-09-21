# Sơ đồ Cơ sở Dữ liệu (Database Schema)

> **Tài liệu nguồn chuẩn**: Đối chiếu và tuân thủ tuyệt đối [Kế hoạch triển khai](../project-plan.md).  
> **Toàn bộ giá trị ENUM được chuẩn hóa đồng nhất theo định dạng `lowercase_snake_case`.**  
> Mỗi bảng được gắn tag giai đoạn (Phase 1 / Phase 2 / Phase 3) tương ứng theo lộ trình phát triển.

---

## 1. Bảng `users` [Phase 2: Admin / Phase 3: Khách hàng]
Quản lý tài khoản quản trị viên (Phase 2) và tài khoản người dùng mua hàng (Phase 3).
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `email` (VARCHAR, Unique, Not Null)
- `password_hash` (VARCHAR, Not Null)
- `full_name` (VARCHAR, Not Null)
- `phone_number` (VARCHAR, Nullable)
- `role` (ENUM: `'admin'`, `'customer'`, Not Null, Default: `'customer'`)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 2. Bảng `tracks` [Phase 1]
Quản lý danh mục bài hát, siêu dữ liệu trưng bày và trạng thái kho nhạc.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `title` (VARCHAR, Not Null)
- `slug` (VARCHAR, Unique, Not Null)
- `description` (TEXT, Nullable)
- `genre` (VARCHAR, Not Null) - Thể loại âm nhạc (dùng cho bộ lọc)
- `mood` (VARCHAR, Not Null) - Tâm trạng âm nhạc (dùng cho bộ lọc)
- `bpm` (INTEGER, Nullable) - Chỉ số nhịp độ (dùng để lưu trữ và hiển thị metadata tham khảo, **không** dùng làm bộ lọc)
- `duration_seconds` (INTEGER, Not Null)
- `preview_file_url` (VARCHAR, Not Null) - URL file MP3 128kbps nén chèn voice watermark (lưu trên CDN/R2 Public hoặc tạm thời trong `public/audio/previews/` ở Phase 1)
- `original_file_key` (VARCHAR, Nullable ở Phase 1, Not Null khi xuất bản ở Phase 2+) - Đường dẫn file master gốc WAV/FLAC trong Private Object Storage. Trong Phase 1 cho phép `NULL` do dùng preview tĩnh; sang Phase 2 bài hát bắt buộc phải có `original_file_key` thì mới được phát hành (`published`). Tuyệt đối không commit vào git repo hay lưu trong `public/`.
- `cover_image_url` (VARCHAR, Nullable) - Ảnh bìa album/track
- `status` (ENUM: `'draft'`, `'published'`, `'reserved'`, `'sold_exclusive'`, `'archived'`, Not Null, Default: `'draft'`)
- `reserved_by_order_id` (UUID, Foreign Key -> `orders.id`, Nullable) - Đơn hàng đang tạm giữ chỗ hoặc đã mua độc quyền bài hát này. Được gán khi đặt chỗ (`reserved`) và khi bán độc quyền (`sold_exclusive`). Thao tác giải phóng / hết hạn / hủy đơn chỉ được phép giải phóng các bài `WHERE reserved_by_order_id = :order_id AND status = 'reserved'`, sau đó xóa trắng `reserved_by_order_id = NULL` và `reserved_until = NULL`.
- `reserved_until` (TIMESTAMP, Nullable) - Mốc thời gian hết hạn tạm khóa khi có đơn mua độc quyền
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 3. Bảng `licenses` [Phase 2]
Định nghĩa các loại giấy phép bản quyền và mức giá áp dụng cho từng bài hát.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `track_id` (UUID, Foreign Key -> `tracks.id`, Not Null)
- `license_type` (ENUM: `'standard'`, `'exclusive'`, Not Null)
- `price` (BIGINT, Not Null) - Giá niêm yết (đơn vị: VNĐ)
- `terms_summary` (TEXT, Nullable) - Tóm tắt điều khoản sử dụng của giấy phép
- `is_active` (BOOLEAN, Not Null, Default: `true`)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 4. Bảng `orders` [Phase 2]
Quản lý thông tin đơn hàng giỏ hàng đa bài hát (`Cart = Multiple Items`), tổng tiền và trạng thái thanh toán.
> **Lưu ý**: Đã loại bỏ các cột đơn lẻ của một bài hát (`track_id`, `license_id`, `amount`) ra khỏi `orders`. Thông tin từng bài thuộc về bảng `order_items`.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `order_code` (VARCHAR, Unique, Not Null) - Mã đơn hàng duy nhất (ví dụ: `ORD-20260921-ABCD`)
- `user_id` (UUID, Foreign Key -> `users.id`, Nullable) - Liên kết tài khoản khách hàng (khách mua vãng lai ở Phase 2 có giá trị `NULL`)
- `customer_email` (VARCHAR, Not Null) - Email nhận link tải và thông báo
- `customer_name` (VARCHAR, Not Null)
- `customer_phone` (VARCHAR, Nullable)
- `total_amount` (BIGINT, Not Null) - Tổng số tiền thanh toán của cả đơn hàng (VNĐ)
- `payment_status` (ENUM: `'pending'`, `'paid'`, `'expired'`, `'cancelled'`, `'refunded'`, Not Null, Default: `'pending'`)
- `needs_refund` (BOOLEAN, Not Null, Default: `false`) - Cột boolean định danh đơn hàng cần hoàn tiền thủ công (đặt trực tiếp trên `orders` giúp trang danh sách đơn hàng của admin lọc nhanh mà không cần JOIN bảng `payments`)
- `paid_claimed_at` (TIMESTAMP, Nullable) - Mốc thời gian khách hàng nhấn "Tôi đã chuyển tiền" để gia hạn giữ chỗ theo cấu hình `settings.claimed_hold_hours` (mặc định 24 giờ)
- `payment_method` (VARCHAR, Not Null, Default: `'bank_transfer_qr'`)
- `download_token` (VARCHAR, Unique, Not Null) - Mã token định danh bảo mật cho phiên tải đơn hàng gửi qua email
- `download_expires_at` (TIMESTAMP, Nullable) - Thời hạn hiệu lực của mã tải (khởi tạo `NULL`, chỉ được thiết lập thành `confirmed_at + settings.download_valid_days` khi đơn hàng chuyển sang trạng thái `'paid'`)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 5. Bảng `order_items` [Phase 2]
Chi tiết từng bài hát và loại giấy phép đi kèm trong đơn hàng đa sản phẩm.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `order_id` (UUID, Foreign Key -> `orders.id`, On Delete Cascade, Not Null)
- `track_id` (UUID, Foreign Key -> `tracks.id`, Not Null)
- `license_id` (UUID, Foreign Key -> `licenses.id`, Not Null)
- `unit_price` (BIGINT, Not Null) - Đơn giá thực tế tại thời điểm mua (VNĐ)
- `download_count` (INTEGER, Not Null, Default: 0) - Số lượt đã tải xuống bài hát này
- `license_pdf_url` (VARCHAR, Nullable) - Đường dẫn file giấy phép PDF được sinh tự động [Phase 3]
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 6. Bảng `payments` [Phase 2 & Phase 3]
Ghi nhận các giao dịch thanh toán (thanh toán đơn hàng nguyên giỏ ở Phase 2; thanh toán đặt cọc/tất toán cho đơn sáng tác riêng ở Phase 3).
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `order_id` (UUID, Foreign Key -> `orders.id`, Nullable) - Đơn hàng mua nhạc có sẵn
- `custom_request_id` (UUID, Foreign Key -> `custom_requests.id`, Nullable) - Đơn đặt sáng tác riêng
- `payment_type` (ENUM: `'full'`, `'deposit'`, `'final'`, Not Null, Default: `'full'`)
- `amount` (BIGINT, Not Null) - Số tiền giao dịch (VNĐ)
- `payment_method` (VARCHAR, Not Null, Default: `'bank_transfer_qr'`)
- `status` (ENUM: `'pending'`, `'paid'`, `'failed'`, `'refunded'`, Not Null, Default: `'pending'`)
- `transaction_code` (VARCHAR, Nullable) - Mã giao dịch hoặc nội dung ngân hàng ghi nhận
- `confirmed_by` (UUID, Foreign Key -> `users.id`, Nullable) - ID tài khoản quản trị viên thực hiện xác nhận tiền về
- `confirmed_at` (TIMESTAMP, Nullable) - Thời điểm quản trị viên nhấn xác nhận
- `notes` (TEXT, Nullable) - Ghi chú đối soát hoặc lý do hoàn tiền (khi bài độc quyền bị mua mất do hết hạn)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 7. Bảng `download_logs` [Phase 2]
Nhật ký bảo mật lưu vết mọi lượt click tải file âm thanh gốc.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `order_item_id` (UUID, Foreign Key -> `order_items.id`, On Delete Cascade, Not Null)
- `ip_address` (VARCHAR, Not Null)
- `user_agent` (TEXT, Nullable)
- `downloaded_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 8. Bảng `settings` [Phase 2]
Cấu hình các tham số động vận hành nghiệp vụ của hệ thống.
- `id` (VARCHAR, Primary Key, Default: `'default'`)
- `hold_minutes` (INTEGER, Not Null, Default: 60) - Số phút tạm giữ chỗ các bài độc quyền khi đơn hàng ở trạng thái `pending` (mặc định 60 phút vì chủ website xác nhận thủ công)
- `claimed_hold_hours` (INTEGER, Not Null, Default: 24) - Số giờ gia hạn giữ chỗ bài độc quyền khi khách nhấn "Tôi đã chuyển tiền"
- `free_revisions` (INTEGER, Not Null, Default: 2) - Số lần yêu cầu chỉnh sửa demo miễn phí cho đơn đặt sáng tác riêng [Phase 3]
- `deposit_percent` (INTEGER, Not Null, Default: 50) - Tỷ lệ phần trăm tiền đặt cọc cần trả trước [Phase 3]
- `download_valid_days` (INTEGER, Not Null, Default: 30) - Số ngày hiệu lực của liên kết tải nhạc gửi qua email
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 9. Bảng `custom_requests` [Phase 1: Gửi form / Phase 3: Quản lý workflow]
Quản lý các yêu cầu đặt làm bài hát độc quyền theo yêu cầu của khách hàng.
> **Lưu ý Phase 1**: Ở Phase 1, form yêu cầu của khách hàng được ghi nhận và lưu trữ trực tiếp vào bảng `custom_requests` ĐỒNG THỜI gửi email thông báo cho chủ website, đảm bảo dữ liệu không bị mất nếu việc gửi email thất bại.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `user_id` (UUID, Foreign Key -> `users.id`, Nullable) - Gắn với tài khoản khách [Phase 3]
- `customer_name` (VARCHAR, Not Null)
- `customer_email` (VARCHAR, Not Null)
- `customer_phone` (VARCHAR, Nullable)
- `brief_description` (TEXT, Not Null) - Mô tả mong muốn, cảm xúc, phong cách âm nhạc
- `reference_links` (TEXT, Nullable) - Link bài hát mẫu hoặc tài liệu tham khảo
- `genre_preference` (VARCHAR, Nullable)
- `target_duration` (VARCHAR, Nullable)
- `budget_estimate` (BIGINT, Nullable)
- `quoted_price` (BIGINT, Nullable) - Báo giá chính thức từ nhạc sĩ [Phase 3]
- `deposit_percent` (INTEGER, Nullable) - Tỷ lệ cọc được snapshot từ `settings.deposit_percent` tại thời điểm báo giá [Phase 3]
- `deposit_amount` (BIGINT, Nullable) - Số tiền cọc cần thanh toán (`quoted_price * deposit_percent / 100`) [Phase 3]
- `remaining_amount` (BIGINT, Nullable) - Số tiền tất toán còn lại [Phase 3]
- `status` (ENUM: `'submitted'`, `'quoted'`, `'deposit_pending'`, `'in_progress'`, `'demo_sent'`, `'revising'`, `'approved'`, `'completed'`, `'cancelled'`, Not Null, Default: `'submitted'`)
- `final_file_key` (VARCHAR, Nullable) - Đường dẫn file master hoàn chỉnh trên Private Storage [Phase 3]
- `revision_limit` (INTEGER, Not Null, Default: 2) - Số lần sửa miễn phí được snapshot từ `settings.free_revisions` tại thời điểm báo giá [Phase 3]
- `revision_used` (INTEGER, Not Null, Default: 0)
- `notes` (TEXT, Nullable)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 10. Bảng `custom_request_revisions` [Phase 3]
Theo dõi lịch sử từng phiên bản demo gửi khách hàng và phản hồi yêu cầu chỉnh sửa.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `custom_request_id` (UUID, Foreign Key -> `custom_requests.id`, On Delete Cascade, Not Null)
- `revision_number` (INTEGER, Not Null) - Số thứ tự lần gửi demo (1, 2,...)
- `demo_file_url` (VARCHAR, Not Null) - URL file demo nghe thử
- `customer_feedback` (TEXT, Nullable) - Ý kiến phản hồi và yêu cầu điều chỉnh của khách
- `admin_notes` (TEXT, Nullable) - Ghi chú từ nhạc sĩ/admin
- `status` (ENUM: `'pending_feedback'`, `'changes_requested'`, `'approved'`, Not Null, Default: `'pending_feedback'`)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 11. Bảng `reviews` [Phase 3]
Hệ thống đánh giá sản phẩm dành riêng cho khách hàng đã hoàn tất mua bài hát (Verified Buyer).
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `user_id` (UUID, Foreign Key -> `users.id`, Not Null) - Khách hàng thực hiện đánh giá
- `track_id` (UUID, Foreign Key -> `tracks.id`, Not Null) - Bài hát được đánh giá
- `order_item_id` (UUID, Foreign Key -> `order_items.id`, Unique, Not Null) - Ràng buộc chứng minh quyền mua hợp lệ; mỗi bài hát trong đơn mua chỉ được đánh giá một lần duy nhất
- `rating` (INTEGER, Not Null) - Điểm xếp hạng từ 1 đến 5 sao
- `comment` (TEXT, Nullable) - Nội dung nhận xét
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)
