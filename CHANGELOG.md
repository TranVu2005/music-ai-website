# Nhật Ký Thay Đổi Tài Liệu (CHANGELOG)

> **Ngày thực hiện**: 2026-09-21  
> **Tài liệu nguồn chuẩn (Source of Truth)**: `docs/project-plan.md` (được trích xuất và hệ thống hóa trực tiếp từ bản kế hoạch gửi khách hàng *"Kế hoạch triển khai website bán nhạc: bản gửi khách hàng"* - 2026-09-20).  
> **Phạm vi dự án**: Đóng băng cố định ở đúng 13 tính năng, phân bổ theo tỷ lệ 5 / 4 / 4 qua 3 giai đoạn (Phase 1: 5 tính năng, Phase 2: 4 tính năng, Phase 3: 4 tính năng).

---

## 1. Danh mục Tài liệu Đã Cập nhật

1. [`docs/project-plan.md`](./docs/project-plan.md) *(Mới)*: Khởi tạo tài liệu kế hoạch nguồn chuẩn, định nghĩa chi tiết 13 tính năng (tỷ lệ 5/4/4), 3 mốc bàn giao thực tế và danh sách tính năng ngoài phạm vi (Out-of-Scope).
2. [`docs/requirements/requirements.md`](./docs/requirements/requirements.md): Cập nhật yêu cầu chức năng, phi chức năng, phạm vi ngoài, gắn thẻ Phase 1/2/3 và loại bỏ tiền tố `TODO:`.
3. [`docs/architecture/overview.md`](./docs/architecture/overview.md): Cập nhật kiến trúc tổng quan, tinh giản stack công nghệ (Next.js fullstack, worker FFmpeg, Cloudflare R2 / AWS S3, Resend `EmailProvider`), cập nhật sơ đồ luồng dữ liệu.
4. [`docs/architecture/database-schema.md`](./docs/architecture/database-schema.md): Mở rộng cơ sở dữ liệu với 6 bảng mới, cấu trúc lại `orders` hỗ trợ giỏ hàng đa sản phẩm (`order_items`), chuẩn hóa enum `lowercase_snake_case`.
5. [`docs/architecture/payment-flow.md`](./docs/architecture/payment-flow.md): Thay thế webhook bằng quy trình xác nhận thủ công từ admin ("Confirm payment received"), đảm bảo idempotency và phòng tránh deadlock bằng atomic row-lock theo thứ tự khóa tăng dần, bổ sung `PaymentProvider` interface và định nghĩa quy tắc xử lý đơn hàng `EXPIRED`.
6. [`docs/architecture/file-protection.md`](./docs/architecture/file-protection.md): Quy định cơ chế phân phối file qua 2 lớp bảo mật (`download_token` 30 ngày và Signed URL 15-30 phút), hạ tầng R2/S3, ghi nhật ký `download_logs` theo `order_item_id`, chính sách cấm tuyệt đối commit file master vào repo / `public/` và cấu hình `.gitignore`.

---

## 2. Chi tiết Các Thay Đổi Ban Đầu

### Thay đổi 1: Phương thức Thanh toán & Xác nhận Thủ công (Payment)
- **Bỏ xác nhận webhook tự động**: Loại bỏ các cổng trung gian webhook (PayOS, SePay, Casso) ở giai đoạn hiện tại. Thay vào đó, áp dụng phương thức chuyển khoản ngân hàng qua mã VietQR, chủ website kiểm tra số dư và bấm nút **"Xác nhận đã nhận tiền" (Confirm payment received)** trên trang quản trị.
- **Bảo toàn Idempotency**: Áp dụng transaction cơ sở dữ liệu có khóa dòng nguyên tử (`SELECT ... FOR UPDATE` trong PostgreSQL) khi chuyển trạng thái đơn hàng từ `PENDING` sang `PAID`. Nếu đơn hàng đã ở trạng thái `PAID`, thao tác bấm xác nhận sẽ được bỏ qua an toàn mà không cấp lặp quyền tải hay gửi nhiều email.
- **Kiến trúc `PaymentProvider` interface**: Thêm định nghĩa interface `PaymentProvider` chuẩn TypeScript trong tài liệu kiến trúc, hỗ trợ sẵn hàm tạo mã QR và để ngỏ các hook xử lý chữ ký/payload webhook cho việc cắm thêm Webhook Adapter trong tương lai mà không ảnh hưởng đến core business logic.
- **Loại bỏ `'payos'` khỏi `payment_method`**: Cột phương thức thanh toán chuẩn hóa thành `'bank_transfer_qr'`.
- **Bổ sung ngoài phạm vi**: Thêm *"Tự động nhận biết tiền đã về tài khoản (automatic bank-transfer detection)"* vào mục Ngoài phạm vi (Out of Scope) trong `requirements.md` và `project-plan.md`.

### Thay đổi 2: Xử lý Đơn hàng Hết hạn (Expired Orders)
- **Thời gian giữ chỗ cấu hình linh hoạt**: Tham số `hold_minutes` được đưa vào bảng `settings`.
- **Quy tắc khi Admin xác nhận đơn hàng `EXPIRED`**:
  1. Hệ thống thực hiện kiểm tra lại tính khả dụng (re-check track availability) của tất cả các bài hát độc quyền trong đơn.
  2. Nếu tất cả bài độc quyền vẫn còn trống: Cho phép kích hoạt đơn hàng, chuyển trạng thái sang `PAID`, đánh dấu bài hát `sold_exclusive`, sinh link tải và gửi email bình thường.
  3. Nếu có ít nhất một bài độc quyền đã bị mua hoặc đang được giữ bởi đơn hàng khác: Hệ thống từ chối kích hoạt, giữ đơn ở trạng thái `EXPIRED` và gắn cờ yêu cầu hoàn tiền thủ công kèm hiển thị cảnh báo để chủ website hoàn tiền.

### Thay đổi 3: Chuẩn hóa Công nghệ (Stack)
- **Loại bỏ backend Express/Fastify riêng biệt**: Hợp nhất mã nguồn vào ứng dụng **Next.js (TypeScript, App Router)** toàn diện, sử dụng Next.js Route Handlers (`src/app/api/...`) để xử lý các RESTful API.
- **Xử lý âm thanh (FFmpeg)**: FFmpeg chạy dưới dạng standalone script / background worker nội bộ trong cùng repository (không cần tách microservice hay dùng service ngoài tốn kém).
- **Lưu trữ Object Storage**: Lựa chọn **Cloudflare R2** (hoặc **AWS S3** tương thích S3 API), loại bỏ hoàn toàn MinIO.
- **Xóa bỏ placeholder**: Xóa triệt để ký hiệu `[STACK]` trên toàn bộ tài liệu kiến trúc và yêu cầu.

### Thay đổi 4: Phạm vi Dự án (Scope)
- **Loại bỏ tính năng**:
  - Loại bỏ *"Thống kê doanh thu"* (Revenue statistics).
  - Loại bỏ *"Tự động xuất hóa đơn"* (Invoice generation).
- **Giữ lại**: Giữ lại tính năng tự động sinh file giấy phép bản quyền dạng PDF ở **Phase 3**.
- **Chỉ số BPM**: Được định vị là siêu dữ liệu (metadata) chỉ để lưu trữ và hiển thị tham khảo cho người nghe trên giao diện bài hát; **không** dùng làm tiêu chí bộ lọc (Catalog filters chỉ bao gồm Thể loại, Tâm trạng và Tìm kiếm từ khóa).

### Thay đổi 5: Quy chế Tải file Bảo mật (Download Flow)
- **Email không nhúng link S3 trực tiếp**: Email gửi khách hàng chứa đường dẫn trỏ về endpoint của ứng dụng đi kèm mã token định danh theo đơn hàng (`download_token`).
- **Thời hạn token linh hoạt**: Mã `download_token` có hiệu lực trong `download_valid_days` (cấu hình trong `settings`, mặc định **30 ngày**).
- **Pre-signed URL ngắn hạn trên mỗi lượt click**: Khi khách hàng nhấp link tải tại trình duyệt, endpoint xác thực trạng thái đơn hàng (`PAID`) và thời hạn token; sau đó sinh Pre-signed URL trực tiếp từ Private Object Storage với thời hạn sống ngắn (**15 - 30 phút**) kèm header `Content-Disposition: attachment; filename="..."`.

### Thay đổi 6: Bổ sung Bảng và Chuẩn hóa Cơ sở Dữ liệu (Schema)
- **Thêm 6 bảng mới**:
  1. `order_items` [Phase 2]: Lưu thông tin chi tiết từng bài hát trong đơn hàng (hỗ trợ Cart nhiều bài hát), lưu `download_count` và `license_pdf_url`.
  2. `payments` [Phase 2 & Phase 3]: Lưu vết giao dịch thanh toán, liên kết `order_id` hoặc `custom_request_id`, hình thức thanh toán (`full`, `deposit`, `final`), thông tin `confirmed_by`, `confirmed_at` và ghi chú hoàn tiền `notes`.
  3. `download_logs` [Phase 2]: Nhật ký bảo mật lưu vết mọi lượt click tải file (`order_item_id`, `ip_address`, `user_agent`, `downloaded_at`).
  4. `settings` [Phase 2]: Quản lý các tham số vận hành nghiệp vụ (`hold_minutes`, `free_revisions`, `deposit_percent`, `download_valid_days`).
  5. `custom_request_revisions` [Phase 3]: Quản lý các phiên bản nghe thử demo và phản hồi chỉnh sửa của khách hàng.
  6. `reviews` [Phase 3]: Đánh giá xếp hạng sao và bình luận của khách hàng cho từng bài hát; có ràng buộc `order_item_id` duy nhất đảm bảo chỉ người đã mua mới được đánh giá.
- **Thêm cột `download_token` vào bảng `orders`** [Phase 2].
- **Thêm giá trị `'expired'` vào enum `payment_status`** [Phase 2].
- **Chuẩn hóa Enum Casing**: Thống nhất 100% giá trị của tất cả các ENUM theo định dạng `lowercase_snake_case`.

### Thay đổi 7: Cấu trúc Tài liệu & Bổ sung Yêu cầu Thiếu (Structure)
- **Xóa bỏ tiền tố `TODO:`**: Loại bỏ toàn bộ `TODO:` trong các file tài liệu.
- **Gắn nhãn giai đoạn (Phase 1 / Phase 2 / Phase 3)**: Mọi yêu cầu, module hệ thống và bảng cơ sở dữ liệu đều được gắn nhãn rõ ràng theo 3 giai đoạn của kế hoạch.
- **Bổ sung các yêu cầu còn thiếu**: Trang chủ, giới thiệu, liên hệ [Phase 1]; Trang bảng giá [Phase 1]; Tài khoản khách hàng [Phase 3]; Đánh giá sản phẩm [Phase 3]; Làm rõ Phase 1 chưa có Admin Panel.

### Thay đổi 8: Quyết định Thiết kế Cốt lõi (Decisions)
- **Giỏ hàng nhiều sản phẩm (`Cart = Multiple Items`)**:
  - Bảng `orders` lưu tổng tiền thanh toán (`total_amount`), thông tin khách hàng, trạng thái thanh toán và `download_token`.
  - Bảng `order_items` lưu `track_id`, `license_id`, đơn giá `unit_price`, số lượt tải `download_count` và liên kết file PDF giấy phép bản quyền.
  - Đã loại bỏ hoàn toàn các cột đơn lẻ của một bài hát cũ (`track_id`, `license_id`, `amount`) ra khỏi bảng `orders`.
- **Cơ chế khóa & giải phóng bài độc quyền đồng thời**: Khóa khi tạo đơn, giải phóng đồng thời khi hết hạn hoặc hủy đơn.
- **Bộ lọc kho nhạc**: Chỉ lọc theo Thể loại (Genre), Tâm trạng (Mood) và Tìm kiếm từ khóa; BPM chỉ dùng để hiển thị thông tin.

---

## 3. Các Hiệu Chỉnh Bổ Sung Tiếp Theo (Follow-up Fixes)

Theo yêu cầu điều chỉnh chi tiết từ Product Owner, các điểm sau đã được cập nhật trực tiếp tại chỗ (in-place):

1. **Điều chỉnh `settings.hold_minutes` mặc định = 60 phút & Thêm hành động "Tôi đã chuyển tiền" [Phase 2]**:
   - `settings.hold_minutes` được nâng giá trị mặc định từ 15 phút lên **60 phút** do chủ website xác nhận đối soát ngân hàng thủ công (15 phút quá ngắn sẽ thường xuyên làm đơn hết hạn nhầm dù khách đã trả tiền).
   - Bổ sung hành động tùy chọn của khách hàng: Nút **"Tôi đã chuyển tiền"** (ghi nhận trường `orders.paid_claimed_at = now()`), tự động gia hạn thời gian giữ chỗ các bài độc quyền trong đơn lên `settings.claimed_hold_hours` (mặc định **24 giờ**) và gửi email thông báo cho chủ website để ưu tiên đối soát.

2. **Định nghĩa `needs_refund` là cột BOOLEAN trên bảng `orders` [Phase 2]**:
   - Đưa cột boolean `needs_refund` (BOOLEAN, Default: `false`) vào bảng `orders`, **không** sử dụng làm giá trị của `payment_status`.
   - *Lý do*: Đặt trực tiếp trên `orders` giúp trang danh sách đơn hàng của Admin có thể lọc nhanh và trực tiếp các đơn cần hoàn tiền mà không cần thực hiện thao tác JOIN sang bảng `payments`.
   - Danh sách đơn hàng phía admin bắt buộc phải hỗ trợ bộ lọc theo cờ `needs_refund`.

3. **Cơ chế Phòng tránh Deadlock khi xử lý Đơn hàng Nhiều Bài Độc Quyền [Phase 2]**:
   - Khi thực hiện giữ chỗ (reserve), giải phóng (release) hoặc xác nhận thanh toán (confirm) cho đơn hàng có nhiều bài độc quyền, hệ thống bắt buộc thực thi trong một Database Transaction duy nhất theo thứ tự khóa nghiêm ngặt:
     1. Khóa bản ghi đơn hàng trước: `SELECT * FROM orders WHERE id = $1 FOR UPDATE`.
     2. Khóa các bản ghi bài hát liên quan theo thứ tự tăng dần của `track.id`: `SELECT * FROM tracks WHERE id IN (...) ORDER BY id ASC FOR UPDATE`.
   - Thứ tự khóa cố định này triệt tiêu hoàn toàn khả năng xảy ra deadlock khi nhiều đơn hàng có các bài độc quyền trùng lặp được xử lý song song.

4. **Snapshot cấu hình tại thời điểm Báo giá cho `custom_requests` [Phase 3]**:
   - Tại thời điểm nhạc sĩ nhập báo giá (`quoted_price`), hệ thống thực hiện sao chép snapshot các giá trị từ `settings` vào bản ghi `custom_requests`:
     - `deposit_percent = settings.deposit_percent`
     - `revision_limit = settings.free_revisions`
   - Đảm bảo các thay đổi cấu hình trong tương lai không làm ảnh hưởng đến các đơn đặt sáng tác đã được báo giá.

5. **Làm rõ Phân bổ Tính năng trong `project-plan.md`**:
   - Xác định rõ 13 tính năng được phân bổ theo tỷ lệ **5 / 4 / 4** qua 3 giai đoạn (Phase 1: 5 tính năng, Phase 2: 4 tính năng, Phase 3: 4 tính năng) thay vì chia đều.
   - Khẳng định tài liệu kế hoạch được trích xuất trực tiếp từ bản kế hoạch gửi khách hàng (*client-facing plan*).

6. **Ghi nhận các Quyết định Đã Giải Quyết (Resolved Decisions)**:
   - **VietQR**: Chuỗi payload chuẩn EMVCo được sinh nội bộ tại mã nguồn ứng dụng, hoàn toàn không phụ thuộc API bên thứ ba; nội dung chuyển khoản chuẩn hóa là `order_code`.
   - **Xác nhận đơn `EXPIRED` có bài độc quyền đã mất**: Hệ thống từ chối toàn bộ đơn hàng, giữ trạng thái đơn là `EXPIRED` và thiết lập cờ `orders.needs_refund = true` cho 100% số tiền đơn hàng.
   - **Email**: Tích hợp dịch vụ **Resend** được bọc sau interface `EmailProvider`. Không ghi các số liệu hạn mức gói miễn phí từ trí nhớ vào tài liệu kiến trúc.
   - **Lưu trữ file âm thanh & `.gitignore`**:
     - Bản nghe thử (preview) trong Phase 1 có thể đặt tạm thời trong `public/audio`.
     - File master chất lượng cao **tuyệt đối không bao giờ** được commit vào git repository hoặc đặt trong thư mục `public/`. Đã bổ sung hướng dẫn quy tắc vào `file-protection.md` và cấu hình mẫu trong `.gitignore` (`*.wav`, `*.flac`, `public/masters/`).

7. **Vị trí `download_token` & Nhật ký Tải file**:
   - `download_token` được duy trì tại bảng `orders` (token định danh phiên tải theo đơn).
   - Nhật ký tải file được theo dõi và ghi nhận chi tiết theo từng `order_item_id` trong bảng `download_logs`.

---

## 4. Danh mục Câu Hỏi Mở (Đã Được Giải Quyết)

Tất cả các câu hỏi mở trước đó liên quan đến cơ chế sinh mã VietQR, xử lý đơn `EXPIRED`, dịch vụ gửi email và lưu trữ file preview ở Phase 1 đã được Product Owner giải quyết dứt điểm và tích hợp đầy đủ vào tài liệu kiến trúc như đã nêu trong mục 3 ở trên.
