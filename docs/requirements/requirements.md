# Yêu cầu dự án: Website bán nhạc (Music Shop)

## 1. Mục tiêu
- TODO: Xây dựng nền tảng website chuyên nghiệp phục vụ bán các bản nhạc sáng tác có sẵn (cho phép nghe thử bản demo có watermark, thanh toán trực tuyến và tự động cấp quyền tải file chất lượng cao).
- TODO: Cung cấp quy trình tiếp nhận, báo giá, quản lý tiến độ và bàn giao cho dịch vụ đặt sáng tác âm nhạc theo yêu cầu riêng của khách hàng.

## 2. Luồng mua nhạc
- TODO: Khách hàng duyệt kho nhạc, tìm kiếm và lọc theo thể loại, tâm trạng, BPM.
- TODO: Khách hàng nghe thử bản demo trực tiếp trên web/mobile (bản preview đã được chèn watermark âm thanh).
- TODO: Khách hàng chọn loại giấy phép (License): Dùng chung hoặc Độc quyền.
- TODO: Thêm vào giỏ hàng và tiến hành thanh toán qua mã QR / chuyển khoản ngân hàng.
- TODO: Hệ thống tạm khóa bài hát (đối với bài độc quyền) trong thời gian chờ thanh toán để tránh mua trùng.
- TODO: Sau khi xác nhận thanh toán thành công, hệ thống gửi email xác nhận kèm đường dẫn tải nhạc có thời hạn (Signed URL) và file giấy phép PDF tương ứng.
- TODO: Nếu là bài độc quyền, hệ thống tự động gỡ bài khỏi kho nhạc công khai.

## 3. Luồng đặt sáng tác
- TODO: Khách hàng điền form gửi yêu cầu mô tả phong cách nhạc, mục đích sử dụng, thời lượng và tài liệu tham khảo.
- TODO: Quản trị viên/Nhạc sĩ xem xét yêu cầu và gửi báo giá chi tiết cho khách hàng.
- TODO: Khách hàng đồng ý báo giá và tiến hành đặt cọc qua cổng thanh toán.
- TODO: Nhạc sĩ tiến hành sáng tác và gửi bản nghe thử (demo) cho khách hàng qua hệ thống.
- TODO: Khách hàng phản hồi và yêu cầu chỉnh sửa (trong số lần chỉnh sửa quy định).
- TODO: Khách hàng duyệt bản cuối cùng, thanh toán phần chi phí còn lại.
- TODO: Hệ thống bàn giao gói file master hoàn chỉnh và giấy phép bản quyền cho khách hàng.

## 4. Loại license
- TODO: Giấy phép Dùng chung (Standard / Non-exclusive): Giá mềm, nhiều khách hàng có thể cùng mua và sử dụng theo điều khoản quy định.
- TODO: Giấy phép Độc quyền (Exclusive): Giá cao, chỉ bán cho một khách hàng duy nhất; gỡ bài vĩnh viễn khỏi kho nhạc sau khi giao dịch hoàn tất.

## 5. Yêu cầu phi chức năng
- TODO: Bảo vệ file âm thanh gốc: Tuyệt đối không để lộ URL trực tiếp của file chất lượng cao ra public.
- TODO: Tốc độ tải và phát bản nghe thử (streaming) mượt mà trên cả trình duyệt máy tính và thiết bị di động.
- TODO: Tính toàn vẹn và an toàn trong giao dịch thanh toán, đảm bảo xử lý webhook idempotency chính xác.
- TODO: Giao diện thân thiện, chuẩn SEO, responsive và hỗ trợ tiếng Việt hoàn chỉnh.

## 6. Ngoài phạm vi
- TODO: Hỗ trợ đa ngôn ngữ (giao diện tiếng Anh) - xem xét phát triển ở giai đoạn sau.
- TODO: Cổng thanh toán thẻ tín dụng quốc tế (Stripe/PayPal) - bổ sung khi mở rộng thị trường.
- TODO: Gói thành viên / thuê bao định kỳ (Subscription).
- TODO: Ứng dụng di động native (iOS / Android) riêng biệt.
