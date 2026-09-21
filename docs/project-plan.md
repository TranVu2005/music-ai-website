# Kế hoạch Triển khai Website Bán Nhạc (Project Plan)

> **Tài liệu nguồn chuẩn (Source of Truth)**  
> Tài liệu này được trích xuất trực tiếp và hệ thống hóa từ bản kế hoạch gửi khách hàng (*"Kế hoạch triển khai website bán nhạc: bản gửi khách hàng"* - 2026-09-20).  
> **Phạm vi dự án được đóng băng ở đúng 13 tính năng, phân bổ theo tỷ lệ 5 / 4 / 4 qua 3 giai đoạn (Phase 1: 5 tính năng, Phase 2: 4 tính năng, Phase 3: 4 tính năng).**

---

## 1. Mục tiêu và Lộ trình Tổng thể

- **Mục tiêu**: Xây dựng website độc lập phục vụ kinh doanh nhạc sáng tác có sẵn và nhận đặt sáng tác theo yêu cầu riêng, sẵn sàng đi vào vận hành kinh doanh trong khoảng 3 tháng (12 - 14 tuần), thực hiện bởi 01 lập trình viên full-time.
- **Tiến độ chia theo 3 giai đoạn bàn giao thực tế (5/4/4 features)**:
  - **Giai đoạn 1 (Bản thử - Tuần 2-3) [5 tính năng]**: Người dùng xem website, nghe thử nhạc mẫu có watermark, gửi form đặt nhạc. Chưa hỗ trợ mua bán online.
  - **Giai đoạn 2 (Bản bán được - Tuần 6-8) [4 tính năng]**: Khách hàng mua nhạc có sẵn, thanh toán chuyển khoản qua mã QR, chủ website xác nhận đã nhận tiền trên trang quản trị, hệ thống tự động giao link tải file nhạc gốc có thời hạn.
  - **Giai đoạn 3 (Bản đầy đủ - Tuần 12-14) [4 tính năng]**: Quy trình đặt sáng tác riêng trọn vẹn (báo giá, đặt cọc, demo, phản hồi chỉnh sửa, bàn giao), tài khoản khách hàng quản lý đơn mua, hệ thống đánh giá sản phẩm và tự động xuất giấy phép bản quyền dạng file PDF.

---

## 2. Danh mục 13 Tính năng Đóng băng (Scope of 13 Features)

| STT | Chức năng | Mô tả chi tiết | Giai đoạn (Phase) |
|:---:|:---|:---|:---:|
| 1 | **Trang chủ, giới thiệu, liên hệ** | Giới thiệu thương hiệu/nghệ sĩ, câu chuyện sáng tác và kênh thông tin liên hệ chính thức. | Phase 1 |
| 2 | **Kho nhạc** | Danh sách bài hát; hỗ trợ tìm kiếm từ khóa, lọc theo thể loại (genre) và tâm trạng (mood). Hiển thị chỉ số BPM dưới dạng thông tin tham khảo. | Phase 1 |
| 3 | **Nghe thử** | Trình phát nhạc trực tiếp (Audio Player) mượt mà trên desktop và thiết bị di động. File phát là bản nén chất lượng thấp chèn voice watermark định kỳ. | Phase 1 |
| 4 | **Bảng giá** | Bảng niêm yết giá cho bài hát có sẵn (theo từng loại giấy phép) và các gói dịch vụ đặt sáng tác riêng. | Phase 1 |
| 5 | **Form gửi yêu cầu đặt nhạc** | Khách hàng điền thông tin nhu cầu sáng tác. Ở Phase 1, hệ thống lưu trữ bản ghi vào `custom_requests` đồng thời gửi email thông báo về hòm thư chủ website, đảm bảo nếu email gửi thất bại thì yêu cầu vẫn không bị mất (chưa có trang quản trị). | Phase 1 |
| 6 | **Giỏ hàng và thanh toán** | Khách chọn một hoặc nhiều bài hát vào giỏ hàng. Thanh toán bằng chuyển khoản quét mã VietQR (payload sinh nội bộ). Chủ website đối soát ngân hàng và bấm "Xác nhận đã nhận tiền" trên trang quản trị. | Phase 2 |
| 7 | **Giao file tự động** | Sau khi chủ website xác nhận đơn, hệ thống gửi email chứa đường link bảo mật có hạn (`download_token`). Khi khách bấm tải, hệ thống cấp link Pre-signed URL 15-30 phút để tải file master chất lượng cao. | Phase 2 |
| 8 | **Hai loại giấy phép** | - **Dùng chung (Standard)**: Giá mềm, nhiều người mua cùng lúc.<br>- **Độc quyền (Exclusive)**: Giá cao, tự động khóa tạm thời khi có khách đặt hàng, gỡ vĩnh viễn khỏi kho nhạc khi giao dịch hoàn tất. | Phase 2 |
| 9 | **Trang quản trị** | Dành riêng cho chủ website: Đăng tải bài hát mới, cập nhật giá và phân loại giấy phép, theo dõi danh sách đơn hàng và thực hiện xác nhận thanh toán thủ công. | Phase 2 |
| 10 | **Quy trình đặt sáng tác riêng** | Quy trình khép kín trên website: Tiếp nhận yêu cầu -> Báo giá -> Khách đặt cọc -> Gửi bản demo nghe thử -> Khách phản hồi chỉnh sửa -> Khách thanh toán phần còn lại -> Bàn giao file master và giấy phép. | Phase 3 |
| 11 | **Tài khoản khách hàng** | Khách hàng đăng ký, đăng nhập để quản lý lịch sử đơn mua nhạc có sẵn và theo dõi tiến độ các đơn đặt sáng tác riêng. | Phase 3 |
| 12 | **Đánh giá** | Khách hàng đã mua bài hát được quyền để lại đánh giá (xếp hạng sao và nhận xét) cho bài hát đó. | Phase 3 |
| 13 | **Giấy phép dạng file PDF** | Tự động sinh file PDF giấy phép bản quyền cho từng bài hát trong đơn hàng thành công, đính kèm thông tin quyền sử dụng và mã giao dịch. | Phase 3 |

---

## 3. Ngoài phạm vi Dự án (Out of Scope)

Các tính năng sau **không** nằm trong phạm vi cam kết của 3 giai đoạn này (có thể mở rộng sau nếu có thỏa thuận riêng):
1. **Giao diện tiếng Anh / Đa ngôn ngữ** (chỉ hỗ trợ Tiếng Việt).
2. **Cổng thanh toán quốc tế bằng thẻ tín dụng** (Stripe, PayPal,...).
3. **Mô hình thuê bao / gói thành viên định kỳ** (Subscription).
4. **Ứng dụng di động native** (iOS / Android app riêng biệt).
5. **Tự động nhận biết tiền về tài khoản ngân hàng** (Automatic bank-transfer detection / Webhook tự động).
6. **Thống kê doanh thu chuyên sâu** (Revenue statistics reporting).
7. **Tự động xuất hóa đơn tài chính** (Invoice generation).

---

## 4. Quy tắc Nghiệp vụ Trọng yếu

1. **Khóa tạm thời và giải phóng bài độc quyền qua `reserved_by_order_id`**:
   - Khi đơn hàng chứa bài độc quyền được tạo, bài hát chuyển sang trạng thái `reserved`, thiết lập `reserved_by_order_id = :order_id` và thời hạn giữ chỗ mặc định 60 phút (`settings.hold_minutes = 60`).
   - Khách hàng có nút tùy chọn "Tôi đã chuyển tiền" (`orders.paid_claimed_at` được ghi nhận) giúp gia hạn thời gian giữ chỗ lên `settings.claimed_hold_hours` (mặc định 24 giờ) và gửi email thông báo cho chủ website đối soát.
   - Thao tác giải phóng / hết hạn / hủy đơn chỉ được phép giải phóng các bài hát thỏa mãn: `WHERE reserved_by_order_id = :order_id AND status = 'reserved'`, sau đó xóa trắng `reserved_by_order_id = NULL` và `reserved_until = NULL`.
   - *Kịch bản QA bắt buộc*: Đơn hàng A hết hạn (`EXPIRED`), đơn hàng B đặt và giữ chỗ cùng bài hát đó (`reserved_by_order_id = B`), sau đó đơn hàng A bị hủy hoặc quét dọn lại (`swept`); quyền giữ chỗ của đơn hàng B phải được bảo toàn nguyên vẹn tuyệt đối.
2. **Xác nhận đơn hàng đã hết hạn (`EXPIRED`)**:
   - Khi chủ website xác nhận thanh toán cho đơn hàng đã hết hạn: Hệ thống kiểm tra lại tính khả dụng của tất cả các bài độc quyền trong đơn dựa trên `reserved_by_order_id`.
   - Nếu toàn bộ bài độc quyền vẫn còn trống (chưa bị đơn khác giữ chỗ `reserved` hoặc mua `sold_exclusive`): Kích hoạt đơn hàng sang `PAID`, chuyển trạng thái bài sang `sold_exclusive` và gán `reserved_by_order_id = :order_id`.
   - Nếu có bài độc quyền đã bị người khác đặt hoặc mua: Hệ thống từ chối toàn bộ đơn hàng, giữ đơn ở trạng thái `EXPIRED` và thiết lập cờ `orders.needs_refund = true` cho 100% số tiền để chủ website hoàn trả cho khách hàng.
3. **Cơ chế tải file**:
   - Email gửi khách hàng chứa link truy cập kèm `download_token` ở cấp độ đơn hàng (`orders`), hiệu lực cấu hình qua `settings.download_valid_days` (mặc định 30 ngày kể từ khi đơn thành `PAID`).
   - Khi nhấp link, hệ thống kiểm tra trạng thái đơn hàng bắt buộc phải là `PAID` và sinh Pre-signed URL tải file gốc có thời hạn ngắn (15 - 30 phút). Lượt tải được lưu vết theo từng `order_item_id`.
