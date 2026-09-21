# Yêu cầu Dự án: Website Bán Nhạc (Music Shop)

> **Tài liệu nguồn chuẩn**: Đối chiếu và tuân thủ tuyệt đối [Kế hoạch triển khai](../project-plan.md).  
> **Phạm vi dự án được đóng băng ở đúng 13 tính năng chia theo tỷ lệ 5 / 4 / 4 qua 3 giai đoạn.**

---

## 1. Mục tiêu Dự án
- Xây dựng nền tảng website chuyên nghiệp phục vụ bán các bản nhạc sáng tác có sẵn (cho phép nghe thử bản demo có watermark âm thanh, thanh toán chuyển khoản qua mã VietQR, chủ website xác nhận thanh toán thủ công và tự động giao link tải file chất lượng cao có thời hạn).
- Cung cấp quy trình tiếp nhận, báo giá, quản lý tiến độ, đặt cọc và bàn giao cho dịch vụ đặt sáng tác âm nhạc theo yêu cầu riêng của khách hàng.

---

## 2. Danh sách 13 Tính năng Đóng băng theo Giai đoạn

- **Giai đoạn 1 (Phase 1 - Bản thử) [5 tính năng]**:
  1. Trang chủ, giới thiệu, liên hệ
  2. Kho nhạc (tìm kiếm, lọc theo thể loại và tâm trạng; BPM hiển thị metadata tham khảo)
  3. Nghe thử (Audio streaming bản demo chèn voice watermark; file demo có thể lưu trong `public/audio`)
  4. Bảng giá (bài có sẵn và các gói sáng tác riêng)
  5. Form gửi yêu cầu đặt nhạc (gửi email về chủ website qua `EmailProvider` tích hợp Resend; chưa có admin panel)
- **Giai đoạn 2 (Phase 2 - Bản bán được) [4 tính năng]**:
  6. Giỏ hàng và thanh toán (Cart nhiều bài hát, chuyển khoản VietQR sinh chuỗi EMVCo nội bộ, chủ website xác nhận thủ công)
  7. Giao file tự động (email chứa link tải kèm `download_token`, sinh Signed URL 15-30 phút khi bấm)
  8. Hai loại giấy phép (Dùng chung và Độc quyền - bán xong gỡ khỏi web)
  9. Trang quản trị (đăng nhạc, chỉnh giá, quản lý đơn hàng có bộ lọc `needs_refund` và xác nhận thanh toán)
- **Giai đoạn 3 (Phase 3 - Bản đầy đủ) [4 tính năng]**:
  10. Quy trình đặt sáng tác riêng khép kín (báo giá snapshot `deposit_percent` & `revision_limit`, đặt cọc, gửi demo, chỉnh sửa, thanh toán còn lại, giao file)
  11. Tài khoản khách hàng (đăng ký, đăng nhập, xem lại đơn đã mua)
  12. Đánh giá (chỉ khách hàng đã mua mới được đánh giá và chấm điểm)
  13. Giấy phép dạng file PDF (tự động tạo file PDF giấy phép cho từng bài trong đơn mua)

---

## 3. Trang Thông tin & Kho Nhạc (Phase 1)
- **Trang chủ, giới thiệu, liên hệ [Phase 1]**: Giới thiệu nghệ sĩ/thương hiệu, phong cách âm nhạc và thông tin liên hệ chính thức.
- **Kho nhạc [Phase 1]**:
  - Duyệt danh sách bài hát trong kho nhạc.
  - Tìm kiếm văn bản (text search) theo tên bài hát và mô tả.
  - Bộ lọc giới hạn: Lọc theo thể loại (Genre) và tâm trạng (Mood).
  - Chỉ số nhịp độ (BPM) được lưu trữ và hiển thị dưới dạng metadata tham khảo cho người nghe, **không** sử dụng làm bộ lọc tìm kiếm.
- **Nghe thử trực tiếp [Phase 1]**:
  - Trình phát nhạc (Audio Player) tương thích và mượt mà trên cả trình duyệt máy tính lẫn điện thoại.
  - File phát là bản nén MP3 chất lượng thấp (128kbps) đã được chèn âm thanh watermark (voice tag) lặp lại định kỳ để bảo vệ quyền tác giả.
  - Trong Phase 1, các file MP3 preview có thể lưu trữ tạm thời trong thư mục `public/audio` của ứng dụng. Tuyệt đối **không bao giờ** commit hoặc lưu file master gốc trong `public/` hay đưa lên git repository.
- **Bảng giá [Phase 1]**: Trang niêm yết rõ ràng mức giá cho từng loại giấy phép bài có sẵn và bảng giá tham khảo cho các gói dịch vụ sáng tác theo yêu cầu.
- **Form gửi yêu cầu đặt nhạc [Phase 1]**:
  - Khách hàng điền form mô tả phong cách, thời lượng, mục đích sử dụng và link tham khảo.
  - Ở Phase 1, hệ thống gửi nội dung yêu cầu trực tiếp về email của chủ website thông qua dịch vụ Resend (được bọc sau `EmailProvider` interface) để phản hồi thủ công. Hệ thống chưa có trang quản trị (Admin Panel) ở giai đoạn này.

---

## 4. Giỏ hàng, Thanh toán & Giao File (Phase 2)
- **Giỏ hàng đa bài hát (Cart = Multiple Items) [Phase 2]**:
  - Khách hàng có thể thêm nhiều bài hát vào cùng một đơn hàng (`orders`).
  - Mỗi mục trong đơn hàng (`order_items`) chứa thông tin một bài hát (`track_id`), một loại giấy phép đi kèm (`license_id`) và đơn giá tại thời điểm mua (`unit_price`). Mỗi bài hát chỉ được chọn một loại license trong một đơn hàng.
- **Hai loại giấy phép (License) [Phase 2]**:
  - **Giấy phép Dùng chung (Standard / Non-exclusive)**: Giá mềm, nhiều khách hàng có thể cùng mua và sử dụng theo điều khoản quy định.
  - **Giấy phép Độc quyền (Exclusive)**: Giá cao, chỉ bán cho một khách hàng duy nhất.
- **Tạm khóa bài hát độc quyền & Giữ chỗ linh hoạt [Phase 2]**:
  - Khi đơn hàng được tạo, mọi bài hát độc quyền trong đơn lập tức được tạm khóa (`status = 'reserved'`, ghi nhận `reserved_until` dựa trên cấu hình `settings.hold_minutes` với giá trị mặc định là **60 phút** - do chủ shop xác nhận thủ công, mức 15 phút sẽ thường xuyên làm hết hạn nhầm các đơn đã trả tiền).
  - **Hành động "Tôi đã chuyển tiền" (I have transferred)**: Khách hàng có thể nhấn nút tùy chọn này sau khi chuyển khoản, hệ thống ghi nhận mốc thời gian `orders.paid_claimed_at`, tự động gia hạn thời gian giữ chỗ của các bài độc quyền trong đơn lên `settings.claimed_hold_hours` (mặc định **24 giờ**) và gửi email thông báo cho chủ website để ưu tiên đối soát.
  - Nếu đơn hàng hết hạn (`EXPIRED`) hoặc bị hủy (`CANCELLED`), toàn bộ bài hát độc quyền được tạm khóa trong đơn sẽ được giải phóng đồng thời về trạng thái công khai (`published`).
- **Thanh toán chuyển khoản VietQR & Xác nhận thủ công [Phase 2]**:
  - Khách hàng thanh toán qua chuyển khoản ngân hàng bằng mã QR. Chuỗi mã hóa VietQR (chuẩn EMVCo) được hệ thống tự động sinh nội bộ (không phụ thuộc dịch vụ bên thứ ba), với nội dung chuyển khoản chuẩn hóa là `order_code`.
  - Thay vì phụ thuộc vào webhook tự động, chủ website sẽ đối soát biến động số dư thực tế tại ngân hàng và nhấn nút "Xác nhận đã nhận tiền" (Confirm payment received) trên trang quản trị.
- **Đảm bảo tính toàn vẹn giao dịch (Concurrency & Idempotency) [Phase 2]**:
  - Thao tác xác nhận thanh toán hoặc giữ chỗ/giải phóng nhiều bài độc quyền bắt buộc phải thực thi trong một Database Transaction duy nhất: Khóa bản ghi `orders` trước, sau đó khóa lần lượt các bản ghi `tracks` theo thứ tự tăng dần của `track.id` (`ORDER BY id ASC FOR UPDATE`) để triệt tiêu hoàn toàn nguy cơ deadlock.
  - Nếu đơn hàng đã ở trạng thái `PAID`, thao tác xác nhận bị bỏ qua an toàn, ngăn chặn việc kích hoạt cấp quyền tải nhiều lần.
- **Quy tắc xử lý khi xác nhận đơn hàng đã hết hạn (`EXPIRED`) [Phase 2]**:
  - Khi chủ website bấm xác nhận một đơn hàng đã chuyển sang `EXPIRED`:
    1. Hệ thống thực hiện kiểm tra lại tính khả dụng (re-check track availability) của tất cả các bài hát độc quyền có trong đơn.
    2. Nếu tất cả các bài độc quyền vẫn còn trống (chưa bị đơn khác giữ chỗ hoặc mua): Cho phép chuyển đơn sang `PAID`, chuyển trạng thái bài sang `sold_exclusive` và tiến hành giao file bình thường.
    3. Nếu có ít nhất một bài độc quyền đã bị đơn khác mua hoặc giữ chỗ: Hệ thống **từ chối toàn bộ đơn hàng**, giữ nguyên trạng thái `EXPIRED` và thiết lập cột boolean `orders.needs_refund = true` cho 100% số tiền đơn hàng để chủ website hoàn trả tiền cho khách.
  - Danh sách đơn hàng trên trang quản trị bắt buộc phải hỗ trợ **bộ lọc theo `needs_refund`** để chủ website nhanh chóng nhận diện và xử lý các đơn hàng cần hoàn tiền.
- **Giao file tự động qua Download Token & Signed URL [Phase 2]**:
  - Sau khi đơn hàng được xác nhận `PAID`, hệ thống tự động gửi email xác nhận cho khách hàng kèm đường dẫn chứa mã truy cập đơn hàng an toàn (`download_token` nằm trên bảng `orders`).
  - Mã `download_token` có thời hạn hiệu lực cấu hình (`download_valid_days`, mặc định 30 ngày).
  - Khi khách hàng nhấn vào đường link trong email tới endpoint của ứng dụng, hệ thống xác thực đơn hàng hợp lệ và sinh Pre-signed URL trực tiếp từ Object Storage với thời hạn ngắn (15 - 30 phút) để khách tải file gốc.
  - Lượt tải file được ghi nhật ký và kiểm soát chi tiết theo từng `order_item_id` trong `download_logs`.
- **Trang quản trị (Admin Panel) [Phase 2]**:
  - Đăng tải bài hát mới và tải lên file âm thanh master/preview.
  - Thiết lập giá bán và điều khoản cho từng loại giấy phép.
  - Quản lý danh sách đơn hàng (hỗ trợ lọc theo `payment_status` và `needs_refund`) và thực hiện hành động xác nhận thanh toán thủ công.
  - Cấu hình các thông số hệ thống (`hold_minutes`, `claimed_hold_hours`, `download_valid_days`).

---

## 5. Đặt Sáng tác Riêng, Tài khoản Khách hàng, Đánh giá & Giấy phép PDF (Phase 3)
- **Quy trình đặt sáng tác riêng trọn vẹn [Phase 3]**:
  - Khách hàng gửi yêu cầu chi tiết qua tài khoản hệ thống.
  - **Cơ chế Snapshot tại thời điểm báo giá**: Khi chủ website/nhạc sĩ nhập báo giá chính thức (`quoted_price`), hệ thống sẽ sao chép nguyên trạng các tham số từ `settings` sang bản ghi `custom_requests` bao gồm: số lần sửa miễn phí (`revision_limit = settings.free_revisions`) và tỷ lệ cọc (`deposit_percent = settings.deposit_percent`). Mọi thay đổi trong cài đặt hệ thống sau này sẽ không làm ảnh hưởng đến các đơn đặt sáng tác đã được báo giá.
  - Khách hàng xác nhận và thanh toán tiền đặt cọc (`deposit_amount = quoted_price * deposit_percent / 100`).
  - Nhạc sĩ sáng tác và tải bản nghe thử (demo) lên hệ thống.
  - Khách hàng nghe demo và gửi phản hồi yêu cầu chỉnh sửa (quản lý qua lịch sử các lần chỉnh sửa `custom_request_revisions`, giới hạn theo `revision_limit` đã snapshot).
  - Khách hàng phê duyệt bản demo cuối cùng và thanh toán số tiền còn lại (`remaining_amount`).
  - Hệ thống tự động bàn giao gói file master hoàn chỉnh và giấy phép bản quyền.
- **Tài khoản khách hàng (Customer Accounts) [Phase 3]**:
  - Khách hàng đăng ký, đăng nhập và quản lý thông tin cá nhân.
  - Xem lại lịch sử các bài hát đã mua cùng liên kết tải file còn hạn.
  - Theo dõi trạng thái và tương tác trực tiếp trong quy trình đặt sáng tác riêng.
- **Đánh giá sản phẩm (Reviews) [Phase 3]**:
  - Chỉ khách hàng đã hoàn tất mua bài hát (verified buyers) mới có quyền gửi đánh giá xếp hạng (từ 1 đến 5 sao) và để lại bình luận cho bài hát đó.
  - Mỗi mục mua (`order_item`) chỉ được tạo một đánh giá tương ứng.
- **Giấy phép dạng file PDF (License PDF) [Phase 3]**:
  - Tự động sinh file giấy phép PDF cho từng bài hát trong đơn hàng (`order_items`).
  - Nội dung PDF thể hiện rõ mã giao dịch, thông tin bên cấp phép, thông tin bên mua và phạm vi quyền hạn sử dụng tương ứng với loại license đã mua.

---

## 6. Yêu cầu Phi chức năng
- **Bảo vệ file âm thanh gốc**: Tuyệt đối không để lộ URL trực tiếp của file master (WAV/FLAC) ra ngoài public. File gốc được lưu trữ trong Private Bucket và chỉ truy cập được qua Signed URL ngắn hạn (15-30 phút). File master tuyệt đối không được commit vào repository hoặc lưu trữ trong thư mục `public/`.
- **Trải nghiệm phát trực tuyến**: Tốc độ streaming bản nghe thử mượt mà trên cả trình duyệt desktop và thiết bị di động.
- **Tính toàn vẹn và an toàn giao dịch**: Sử dụng transaction có row-level lock theo thứ tự khóa tránh deadlock (`orders` trước, sau đó `tracks` theo `id ASC`), đảm bảo không xảy ra race condition hay xác nhận trùng lặp đơn hàng.
- **Giao diện người dùng**: Chuẩn responsive (tối ưu di động), hỗ trợ tiếng Việt hoàn chỉnh và thân thiện SEO.

---

## 7. Ngoài phạm vi Dự án (Out of Scope)
- Hỗ trợ đa ngôn ngữ (giao diện tiếng Anh) - xem xét ở các giai đoạn mở rộng sau.
- Cổng thanh toán thẻ tín dụng quốc tế (Stripe, PayPal,...).
- Gói thuê bao / thành viên định kỳ (Subscription).
- Ứng dụng di động native riêng (iOS / Android app).
- Tự động nhận biết tiền đã về tài khoản ngân hàng (Automatic bank-transfer detection qua webhook).
- Thống kê và báo cáo doanh thu chuyên sâu (Revenue statistics).
- Tự động xuất hóa đơn tài chính (Invoice generation).
