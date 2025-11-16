# Kế hoạch xuất file Excel báo cáo thu chi công nợ

## 1. Mục tiêu
Tạo chức năng xuất file Excel báo cáo thu chi công nợ theo khoảng thời gian (từ ngày - đến ngày)

## 2. Phạm vi dữ liệu báo cáo

### 2.1. Thu (INCOME)
- Thu từ khách hàng (CustomerAdvancePayment - SUBMITTED/RECONCILED)
- Các khoản thu khác từ CompanyTransaction (INCOME)

### 2.2. Chi (EXPENSE)
- Phiếu chi đã duyệt (ExpenseVoucher - APPROVED/PAID)
- Chi tạm ứng tài xế (DriverExpenseAdvance - TRANSFERRED)
- Các khoản chi khác từ CompanyTransaction (EXPENSE)

### 2.3. Công nợ
- Công nợ khách hàng (CustomerAdvancePayment - PENDING/SUBMITTED)
- Công nợ tài xế (DriverExpenseAdvance - REQUESTED/APPROVED/TRANSFERRED)

## 3. Cấu trúc file Excel

### Sheet 1: Tổng quan
- Thông tin báo cáo: Từ ngày, Đến ngày, Ngày xuất
- Tổng thu trong kỳ
- Tổng chi trong kỳ
- Số dư đầu kỳ
- Số dư cuối kỳ
- Công nợ khách hàng
- Công nợ tài xế

### Sheet 2: Chi tiết thu
| STT | Ngày | Mã phiếu | Loại | Khách hàng | Số tiền | Mô tả | Người tạo |
|-----|------|----------|------|------------|---------|-------|-----------|

### Sheet 3: Chi tiết chi
| STT | Ngày | Mã phiếu | Loại | Danh mục | Người nhận | Số tiền | Mô tả | Người tạo | Trạng thái |
|-----|------|----------|------|----------|------------|---------|-------|-----------|------------|

### Sheet 4: Công nợ khách hàng
| STT | Mã phiếu | Khách hàng | Số điện thoại | Chuyến | Số tiền | Trạng thái | Ngày tạo | Ghi chú |
|-----|----------|------------|----------------|--------|---------|------------|----------|---------|

### Sheet 5: Công nợ tài xế
| STT | Mã phiếu | Tài xế | Chuyến | Loại chi phí | Số tiền | Trạng thái | Ngày tạo | Ghi chú |
|-----|----------|--------|--------|--------------|---------|------------|----------|---------|

## 4. Công nghệ sử dụng

### Backend
- Apache POI (đã có trong pom.xml version 5.2.2)
  - `XSSFWorkbook` để tạo file Excel .xlsx
  - `XSSFSheet` để tạo các sheet
  - `XSSFCellStyle` để format cells

### Frontend
- Download file trực tiếp từ API response
- Sử dụng `blob` và `URL.createObjectURL` để tải file

## 5. Các bước triển khai

### Phase 1: Backend - Service Layer
1. Tạo `ReportService` interface và implementation
2. Tạo method `generateAccountingReport(from, to)` trả về `ByteArrayResource`
3. Query dữ liệu từ các bảng:
   - `company_transactions` (filter by date range)
   - `expense_vouchers` (filter by date range, status APPROVED/PAID)
   - `customer_advance_payments` (filter by date range, status)
   - `driver_expense_advances` (filter by date range, status)
4. Tạo Excel workbook với 5 sheets
5. Format cells (currency, date, header style)

### Phase 2: Backend - Controller Layer
1. Tạo endpoint `GET /transport-service/reports/accounting/export`
2. Query params: `from` (String), `to` (String)
3. Response: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
4. Headers: `Content-Disposition: attachment; filename="bao-cao-thu-chi-YYYYMMDD.xlsx"`

### Phase 3: Frontend - API Service
1. Thêm method `exportAccountingReport(from, to)` trong `apiService.ts`
2. Return `Blob` response

### Phase 4: Frontend - UI Component
1. Thêm nút "Xuất báo cáo Excel" trong trang Accounting hoặc ExpenseVouchers
2. Dialog chọn khoảng thời gian (DatePicker)
3. Call API và download file

## 6. Chi tiết implementation

### 6.1. Backend Service Method
```java
public ByteArrayResource generateAccountingReport(String from, String to) {
    // 1. Parse dates
    // 2. Query data
    // 3. Create workbook
    // 4. Fill data
    // 5. Format cells
    // 6. Write to ByteArrayOutputStream
    // 7. Return ByteArrayResource
}
```

### 6.2. Data Queries
- CompanyTransaction: `findByCreatedAtBetween(from, to)`
- ExpenseVoucher: `findByCreatedAtBetweenAndStatusIn(from, to, [APPROVED, PAID])`
- CustomerAdvancePayment: `findByCollectedAtBetween(from, to)` + `findByStatusIn([PENDING, SUBMITTED])`
- DriverExpenseAdvance: `findByRequestedAtBetween(from, to)` + `findByStatusIn([REQUESTED, APPROVED, TRANSFERRED])`

### 6.3. Excel Formatting
- Headers: Bold, background color, border
- Currency: Number format với VND
- Date: Date format dd/MM/yyyy
- Auto-size columns
- Freeze first row

## 7. File structure

```
xeghepBE/
  src/main/java/com/brostech/transport/
    service/
      ReportService.java (interface)
    service/impl/
      ReportServiceImpl.java
    controller/
      ReportController.java
    dto/report/
      AccountingReportDTO.java (nếu cần)
```

## 8. Testing
- Test với khoảng thời gian hợp lệ
- Test với khoảng thời gian không có dữ liệu
- Test với khoảng thời gian lớn (performance)
- Test download file

## 9. Timeline ước tính
- Phase 1: 2-3 giờ
- Phase 2: 1 giờ
- Phase 3: 30 phút
- Phase 4: 1-2 giờ
- Testing: 1 giờ
**Tổng: 5-7 giờ**

## 10. Lưu ý
- Xử lý memory cho file lớn (streaming nếu cần)
- Error handling khi không có dữ liệu
- Format số tiền theo chuẩn VN (dấu phẩy ngăn cách hàng nghìn)
- Timezone: UTC hoặc VN timezone

