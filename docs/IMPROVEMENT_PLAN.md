# 🗺️ Kế hoạch Triển khai & Kiểm thử Toàn diện

> **Phiên bản**: 1.0 — 2026-03-20  
> Tổng hợp từ `PROJECT_OVERVIEW.md` (16 tính năng backend) + `FRONTEND_OVERVIEW.md` (11 tính năng frontend)

---

## Tổng quan Phân Pha

| Pha | Tên | Scope | Ưu tiên |
|---|---|---|---|
| **Phase 1** | Driver Ledger & Đồng bộ FE | 3 BE + 3 FE cốt lõi đã thiếu | 🔴 Ngay bây giờ |
| **Phase 2** | UX & Admin nâng cao | 5 BE + 5 FE | 🟡 Sau Phase 1 |
| **Phase 3** | Hệ thống & Scale | 8 BE + 3 FE | 🟢 Tương lai |

---

## Phase 1 — Driver Ledger & Đồng bộ Frontend (Critical)

> Hoàn thiện Phương án A đã implement ở backend nhưng frontend chưa hiển thị.

---

### 1.1 [BE] API Lịch sử Sổ Quỹ Tài xế

**Mô tả**: Tạo endpoint `GET /payments/driver-transactions` để tra cứu lịch sử biến động dư nợ từ bảng `driver_transactions`.

**Công việc Backend**:
- [ ] `DriverTransactionController` — Thêm endpoint `GET /payments/driver-transactions`
  - Params: `driverId` (required), `from`, `to`, `page`, `size`
- [ ] `DriverTransactionRepository` — Thêm query `findByDriverIdAndCreatedAtBetween`
- [ ] `DriverTransactionDTO` — Tạo DTO response (id, driverId, amount, transactionType, referenceType, referenceId, description, balanceAfter, createdAt)
- [ ] `PaymentService.getDriverTransactions()` — Business logic

**Test Plan Backend**:
```
✅ GET /payments/driver-transactions?driverId=1 → trả về list
✅ GET /payments/driver-transactions?driverId=1&from=2026-01-01&to=2026-12-31 → lọc theo ngày
✅ Kiểm tra balance_after liên tiếp tạo thành chuỗi đúng
✅ Kiểm tra permission: DRIVER chỉ xem được của mình
```

---

### 1.2 [BE] Migration Dư Nợ Đầu Kỳ

**Mô tả**: Endpoint để chuyển `outstanding_balance` hiện tại của tài xế cũ thành bản ghi `INITIAL_BALANCE` trong `driver_transactions`, tránh mất lịch sử.

**Công việc Backend**:
- [ ] `DataMigrationController` — Thêm `POST /admin/migrate-initial-balances`
  - Duyệt qua tất cả DRIVER có `outstandingBalance > 0`
  - Tạo 1 dòng `DriverTransaction` với `referenceType = INITIAL_BALANCE`, `balanceAfter = outstandingBalance`
  - Idempotent: skip driver đã có dòng `INITIAL_BALANCE`
- [ ] Thêm `@PreAuthorize("hasRole('ADMIN')")` để bảo vệ endpoint

**Test Plan**:
```
✅ Gọi 1 lần → tạo đúng số dòng = số tài xế có outstanding > 0
✅ Gọi lần 2 (idempotent) → không tạo thêm dòng trùng
✅ balanceAfter == outstandingBalance của tài xế
```

---

### 1.3 [BE] Xử lý Đồng thời — Optimistic Locking

**Mô tả**: Thêm `@Version` vào `User.outstandingBalance` để tránh race condition khi nhiều giao dịch cùng lúc.

**Công việc Backend**:
- [ ] `User.java` — Thêm `@Version private Long version;`
- [ ] Xử lý `ObjectOptimisticLockingFailureException` ở `PaymentServiceImpl` → retry hoặc trả về lỗi 409

**Test Plan**:
```
✅ Simulate 2 request đồng thời cùng tài xế → chỉ 1 thành công, 1 retry/lỗi 409
✅ outstanding_balance sau đó vẫn đúng
```

---

### 1.4 [FE] Màn hình Sổ Quỹ Tài xế

**Mô tả**: Trang `/accounting/driver-ledger` hoặc tab trong `Accounting.tsx` hiển thị lịch sử giao dịch từ `driver_transactions`.

**Công việc Frontend**:
- [ ] Thêm interface `DriverTransactionResponse` vào `api.ts`
- [ ] Thêm `apiService.getDriverTransactions(driverId, from, to, page)` vào `apiService.ts`
- [ ] Tạo UI: bảng giao dịch gồm ngày, loại (+/-), số tiền, mô tả, số dư sau
  - DEBIT: màu đỏ, CREDIT: màu xanh
  - Badge hiển thị `referenceType`
- [ ] Filter: chọn tài xế, chọn khoảng thời gian
- [ ] Thêm route `/accounting/driver-ledger` trong `App.tsx` (allowed: admin, accountant)
- [ ] Thêm menu item trong `AppSidebar.tsx`

**Test Plan**:
```
✅ Load trang → hiện đúng danh sách giao dịch
✅ Filter theo ngày hoạt động đúng
✅ Badge loại giao dịch hiển thị đúng màu
✅ ACCOUNTANT login → thấy menu; DRIVER login → không thấy
```

---

### 1.5 [FE] Thêm `paymentMethod` vào Form Nộp Tiền

**Mô tả**: Form "Ghi nhận nộp tiền" trong `Accounting.tsx` và `DriverDashboard.tsx` hiện chưa có dropdown chọn phương thức (tiền mặt / chuyển khoản), dù backend đã hỗ trợ từ `DepositRecord.paymentMethod`.

**Công việc Frontend**:
- [ ] Cập nhật `DepositRecordRequest` interface trong `api.ts` — thêm `paymentMethod: 'CASH' | 'TRANSFER'`
- [ ] Thêm `Select` component chọn phương thức trong form nộp tiền ở `Accounting.tsx`
- [ ] Nếu có form trong `DriverDashboard.tsx` → cũng cập nhật tương tự
- [ ] Hiển thị `paymentMethod` trong bảng lịch sử deposit

**Test Plan**:
```
✅ Chọn CASH → gửi lên API với paymentMethod=CASH
✅ Chọn TRANSFER → gửi lên API với paymentMethod=TRANSFER
✅ Danh sách deposit hiện cột phương thức
```

---

### 1.6 [FE] Hiển thị `customerPrepaid` trong Daily Summary

**Mô tả**: `DriverDashboard` hiển thị tóm tắt ngày nhưng chưa hiện cột "Khách đã chuyển khoản trước", khiến tài xế không hiểu tại sao số tiền phải nộp thấp hơn giá vé.

**Công việc Frontend**:
- [ ] Cập nhật `DriverDailyTripSummaryResponse` trong `api.ts` → thêm `customerPrepaid: number`
- [ ] Bảng danh sách chuyến trong `DriverDashboard.tsx` → thêm cột "Khách TK trước" (customerPrepaid)
- [ ] Thêm tooltip giải thích công thức: `Phải nộp = Giá vé - Đã nộp - Khách TK trước`

**Test Plan**:
```
✅ Chuyến có CustomerAdvance RECONCILED → hiện đúng số tiền ở cột customerPrepaid
✅ expectedAmount tính đúng
✅ Tooltip hiển thị đủ thông tin
```

---

## Phase 2 — UX & Admin Nâng Cao

---

### 2.1 [BE] Export Báo Cáo Excel

**Mô tả**: API xuất file `.xlsx` cho báo cáo kế toán và phiếu chi. Đã có `poi-ooxml` trong `pom.xml`.

**Công việc Backend**:
- [ ] `GET /payments/summary/export?from=&to=` → Excel file: Tổng hợp tài xế
- [ ] `GET /expenses/vouchers/export?from=&to=&status=` → Excel file: Phiếu chi
- [ ] Mỗi sheet: header đẹp, cột số tiền format VND, tổng dòng cuối

**Test Plan**:
```
✅ Download file → mở được bằng Excel/LibreOffice
✅ Dữ liệu match với dữ liệu trên màn hình
✅ Tổng cuối trang đúng
✅ File name có tên theo ngày xuất
```

---

### 2.2 [BE] Lịch sử Trạng thái Chuyến đi

**Mô tả**: Thêm bảng `trip_status_histories` tương tự `expense_voucher_histories`.

**Công việc Backend**:
- [ ] Tạo entity `TripStatusHistory` (tripId, fromStatus, toStatus, changedBy, note, changedAt)
- [ ] Repository + Service để ghi lịch sử mỗi lần cập nhật trip status
- [ ] Endpoint `GET /trips/{id}/history`

**Test Plan**:
```
✅ Update trip status nhiều lần → history ghi đủ dòng
✅ Thứ tự chronological đúng
✅ fromStatus và toStatus phản ánh đúng transition
```

---

### 2.3 [BE] Role-Based Access Control chặt hơn

**Mô tả**: Chuyển kiểm tra quyền từ `if (role != ADMIN) throw...` sang annotation `@PreAuthorize`.

**Công việc Backend**:
- [ ] Bật `@EnableMethodSecurity` trong Security config
- [ ] Thêm `@PreAuthorize` vào các method Service/Controller cần bảo vệ
- [ ] Viết unit test kiểm tra RBAC

**Test Plan**:
```
✅ DRIVER gọi /admin/... → 403
✅ ACCOUNTANT duyệt phiếu APPROVED → 403
✅ ADMIN gọi mọi endpoint → 200
```

---

### 2.4 [FE] Tìm kiếm Nhanh Khách hàng khi Tạo Booking

**Mô tả**: Autocomplete tìm `Customer` theo tên/SĐT và tự điền thông tin.

**Công việc Frontend**:
- [ ] `CreateBooking.tsx`: Thêm Combobox tìm kiếm customer từ API `/customers?q=...`
- [ ] Khi chọn → tự điền `customerName`, `customerPhone`
- [ ] Debounce 300ms để tránh spam request

**Test Plan**:
```
✅ Gõ 3 ký tự → dropdown hiện danh sách
✅ Chọn 1 → form tự điền thông tin
✅ Xoá lựa chọn → form reset
```

---

### 2.5 [FE] Thêm Route Chỉnh sửa Tài xế

**Mô tả**: Hiện tại không có trang `/drivers/:id/edit`, admin phải tạo lại từ đầu.

**Công việc Frontend**:
- [ ] Tạo `EditDriver.tsx` (copy structure từ `AddDriver.tsx`, thêm load & pre-fill data)
- [ ] Thêm route `/drivers/:id/edit` trong `App.tsx`
- [ ] Nút "Sửa" trong `Drivers.tsx` và `VehicleDetail.tsx` (tương tự)

**Test Plan**:
```
✅ Vào /drivers/1/edit → form pre-fill đúng thông tin
✅ Sửa và submit → cập nhật thành công
✅ DISPATCHER cố vào → redirect
```

---

### 2.6 [FE] Notification Badge cho Phiếu Chờ Duyệt

**Mô tả**: Badge đỏ trên sidebar menu hiển thị số phiếu tạm ứng và phiếu chi đang chờ duyệt.

**Công việc Frontend**:
- [ ] Tạo custom hook `usePendingCounts()` — gọi API đếm `driver-advances?status=REQUESTED` và `expenses/vouchers?status=PENDING`
- [ ] Hiển thị badge trong `AppSidebar.tsx` tương ứng
- [ ] Refresh mỗi 30 giây hoặc khi có action mới

**Test Plan**:
```
✅ Có 3 phiếu REQUESTED → badge hiện "3"
✅ Duyệt 1 phiếu → badge giảm còn "2"
✅ Không có phiếu → badge ẩn
```

---

### 2.7 [FE] Xác nhận Trước khi Xóa

**Mô tả**: Thêm AlertDialog (đã có trong shadcn/ui) trước các thao tác xóa quan trọng.

**Công việc Frontend**:
- [ ] Kiểm tra tất cả nút `onDelete` trong: `Drivers.tsx`, `VehicleList.tsx`, `Customers.tsx`, `Users.tsx`
- [ ] Bọc bằng `<AlertDialog>` confirm "Bạn có chắc muốn xóa?"

**Test Plan**:
```
✅ Nhấn Xóa → dialog hiện ra
✅ Nhấn Hủy → không xóa
✅ Nhấn Xác nhận → xóa và toast thành công
```

---

### 2.8 [FE] Export Excel từ UI

**Mô tả**: Nút "Export Excel" trong `Accounting.tsx` và `ExpenseVouchers.tsx` (sau khi BE xong 2.1).

**Công việc Frontend**:
- [ ] Thêm `apiService.exportAccountingSummary(from, to)` → trigger download
- [ ] Thêm `apiService.exportExpenseVouchers(params)` → trigger download
- [ ] Nút Export + loading state

**Test Plan**:
```
✅ Click Export → file tải về
✅ Không có data → disable button hoặc toast warning
```

---

## Phase 3 — Hệ thống & Scale (Future)

> Các tính năng quan trọng dài hạn, không cấp thiết cho vận hành ngày-to-ngày.

### 3.1 [BE] Quản lý Bảo Dưỡng Xe

- Scheduled job: Kiểm tra `next_maintenance <= now()` → tự cảnh báo / chuyển xe sang `BAO_TRI`
- Endpoint: `GET /vehicles/maintenance-due`

### 3.2 [BE] Thông Báo Push/Zalo OA

- Tích hợp Zalo OA API → gửi tin khi: chuyến xác nhận, tài xế được phân công, ứng tiền được duyệt
- Event-driven qua Spring ApplicationEvent hoặc message queue

### 3.3 [BE] Soft Delete

- Thêm `deleted_at TIMESTAMP` vào tất cả entity chính
- `@Where(clause = "deleted_at IS NULL")` trên mỗi entity
- Tạo migration dữ liệu cũ

### 3.4 [BE] Audit Log Toàn Hệ Thống

- Bảng `audit_logs` (entity, entity_id, action, old_value, new_value, actor_id, timestamp)
- AOP `@Around` ghi log mọi Service method quan trọng

### 3.5 [BE] API Rate Limiting

- Cấu hình Rate Limit per IP qua Spring Cloud Gateway hoặc Bucket4j

### 3.6 [BE] Trip Price Tách biệt Cash/Prepaid

- Thêm cột `cash_amount`, `prepaid_amount` vào bảng `trips`
- Migration: `cash_amount = price - tổng CustomerAdvance` per trip

### 3.7 [BE] Trip Matching Algorithm

- API gợi ý ghép chuyến dựa trên: pickup gần nhau, cùng ngày, số ghế còn trống

### 3.8 [BE] Customer Portal

- Module mới: Khách tự đặt chuyến, tra cứu trạng thái online

### 3.9 [FE] Dashboard Analytics

- Biểu đồ doanh thu theo tuần/tháng ở `Index.tsx` dùng Recharts (đã có sẵn)

### 3.10 [FE] Lazy Loading

- `React.lazy()` cho `CallCenter.tsx`, `ExpenseVouchers.tsx`, `GroupTrips.tsx`
- Giảm initial bundle size (~50%)

### 3.11 [FE] Dark Mode

- Toggle Dark Mode ở header, persist vào localStorage
- Đã có `next-themes`, chỉ cần test từng page

---

## Tóm tắt Khối lượng Công việc

| Pha | Tính năng | Ước tính |
|---|---|---|
| Phase 1 | 6 items (3 BE + 3 FE) | ~3–5 ngày dev |
| Phase 2 | 8 items (3 BE + 5 FE) | ~1–2 tuần dev |
| Phase 3 | 11 items (8 BE + 3 FE) | ~1 tháng+ |

---

## Thứ tự Ưu tiên Thực hiện (Phase 1)

```
1. [BE] 1.2 Migration dư nợ đầu kỳ       ← Chạy 1 lần ngay khi deploy
2. [FE] 1.5 paymentMethod trong form nộp   ← FE nhanh, backend đã sẵn
3. [FE] 1.6 customerPrepaid DriverDashboard ← FE nhanh, backend đã sẵn
4. [BE] 1.1 API lịch sử driver_transactions
5. [FE] 1.4 Màn hình Sổ Quỹ Tài xế        ← Phụ thuộc 1.1
6. [BE] 1.3 Optimistic Locking             ← Quan trọng về data integrity
```
