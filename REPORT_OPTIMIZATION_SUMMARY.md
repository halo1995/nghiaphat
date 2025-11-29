# Tối ưu Báo cáo Excel - Thêm Sheet Tổng hợp Chuyến đi

## Tóm tắt

Đã tối ưu hóa chức năng báo cáo Excel và thêm sheet mới "Tổng hợp chuyến đi" để hiển thị chi tiết tất cả các chuyến trong kỳ báo cáo.

## Các Sheet hiện có

1. **Tổng quan** - Tổng hợp thu chi, công nợ
2. **Chi tiết thu** - Thu từ khách hàng, thu khác
3. **Chi tiết chi** - Phiếu chi, tạm ứng tài xế
4. **Công nợ khách hàng** - Danh sách công nợ khách
5. **Công nợ tài xế** - Danh sách công nợ tài xế
6. **Lịch sử thu tiền** - TripPayment (tiền tài xế thu từ khách)
7. **Lịch sử nộp tiền** - DepositRecord (tiền tài xế nộp về)
8. **Tổng hợp chuyến đi** - ✨ MỚI

## Sheet mới: Tổng hợp chuyến đi

### Thông tin hiển thị:
- STT
- Mã chuyến
- Ngày hoàn thành
- Tài xế
- Khách hàng
- SĐT Khách
- Điểm đón
- Điểm trả
- Số hành khách / Bao xe
- Giá chuyến
- Đã thu từ khách (TripPayment)
- Đã nộp về công ty (DepositRecord)
- Còn phải nộp
- Trạng thái thanh toán
- Ghi chú

### Logic tính toán:
- **Đã thu từ khách**: Tổng TripPayment cho chuyến đó
- **Đã nộp về công ty**: Tổng DepositRecord có tripId = chuyến đó
- **Còn phải nộp**: Giá chuyến - Đã nộp về công ty
- **Trạng thái thanh toán**: 
  - "Đã đủ" nếu đã nộp >= giá chuyến
  - "Còn thiếu" nếu đã nộp < giá chuyến
  - "Chưa nộp" nếu chưa nộp gì

### Lợi ích:
1. Xem tổng quan tất cả chuyến đi trong kỳ
2. Theo dõi tình trạng thanh toán từng chuyến
3. Phát hiện chuyến nào chưa nộp tiền
4. Đối chiếu giữa thu và nộp
5. Hỗ trợ kiểm toán và đối soát

## Cách thêm vào code

Thêm method `createTripSummarySheet()` vào ReportServiceImpl.java sau method `createDepositHistorySheet()`.

Method này sẽ:
1. Query tất cả trips hoàn thành trong kỳ
2. Query TripPayment và DepositRecord tương ứng
3. Tính toán số tiền đã thu, đã nộp, còn thiếu
4. Xuất ra Excel với format đẹp

## Tối ưu hóa

1. **Cache**: Sử dụng Map để cache User, Trip tránh query nhiều lần
2. **Batch query**: Query tất cả data cần thiết một lần
3. **Style**: Tái sử dụng CellStyle cho performance
4. **Auto-size**: Tự động điều chỉnh độ rộng cột

## File cần sửa

- `xeghepBE/src/main/java/com/brostech/transport/service/impl/ReportServiceImpl.java`

Thêm method mới và gọi nó trong `generateAccountingReport()` sau dòng 145.
