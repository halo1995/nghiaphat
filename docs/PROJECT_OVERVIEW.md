# 📋 Tổng quan Dự án: Xeghep Transport Service

> **Cập nhật lần cuối**: 2026-03-20  
> **Tech Stack**: Spring Boot 3.1.4 · Java 17 · PostgreSQL · Hibernate · Lombok · MapStruct

---

## 1. Mục tiêu Hệ thống

Ứng dụng quản lý vận chuyển hành khách nội bộ dành cho công ty xe ghép, bao gồm:

- Tiếp nhận và quản lý đặt chuyến từ khách hàng
- Ghép chuyến đi theo nhóm (grouping)
- Phân công tài xế và xe
- Ghi nhận thu chi, theo dõi dư nợ tài xế
- Quản lý phiếu chi nội bộ
- Báo cáo kế toán tổng hợp

---

## 2. Phân Hệ & Vai Trò

| Vai trò | Mô tả |
|---|---|
| `ADMIN` | Quản trị toàn hệ thống, phê duyệt các thao tác tài chính |
| `DISPATCHER` | Điều phối xe, ghép chuyến |
| `CALL_CENTER` | Tiếp nhận đặt chuyến, tạo phiếu ứng trước khách hàng |
| `DRIVER` | Tài xế, thực hiện chuyến đi |
| `ACCOUNTANT` | Kế toán, xác nhận thu chi, đối soát |

---

## 3. Database Schema (Tất cả Bảng)

### 3.1 Core — Vận hành

#### `users` — Người dùng / Tài xế

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `username` | VARCHAR(64) UNIQUE | Tên đăng nhập |
| `password` | VARCHAR(255) | BCrypt hash |
| `name` | VARCHAR(255) | Tên hiển thị |
| `role` | ENUM | ADMIN, DISPATCHER, CALL_CENTER, DRIVER, ACCOUNTANT |
| `email` | VARCHAR(255) | |
| `phone` | VARCHAR(32) | |
| `license_number` | VARCHAR(64) | Số GPLX (chỉ DRIVER) |
| `license_expiry` | TIMESTAMP | Hạn GPLX |
| `address` | VARCHAR(500) | |
| `date_of_birth` | TIMESTAMP | |
| `join_date` | TIMESTAMP | Ngày vào làm |
| `driver_status` | ENUM | HOAT_DONG, NGHI_PHEP, NGUNG_HOAT_DONG |
| `vehicle_id` | BIGINT FK | Xe được phân công |
| `total_trips` | INT | Tổng chuyến đã chạy |
| `rating` | DOUBLE | Đánh giá trung bình |
| `total_earnings` | DOUBLE | Tổng thu nhập tích lũy |
| `outstanding_balance` | DOUBLE | **Dư nợ hiện tại của tài xế** |
| `created_at`, `updated_at`, `last_login` | TIMESTAMP | |

#### `customers` — Khách hàng

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `name` | VARCHAR(255) | Họ tên |
| `phone` | VARCHAR(32) | |
| `email` | VARCHAR(64) | |
| `address` | VARCHAR(500) | |
| `join_date` | TIMESTAMP | |
| `total_trips` | INT | Số chuyến đã đặt |
| `total_spent` | DOUBLE | Tổng chi tiêu |
| `rating` | DOUBLE | |
| `status` | ENUM | HOAT_DONG, NGUNG_HOAT_DONG |

#### `vehicles` — Xe

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `name` | VARCHAR(255) | Tên xe |
| `license_plate` | VARCHAR(32) UNIQUE | Biển số |
| `brand`, `model` | VARCHAR(255) | Hãng, dòng xe |
| `year` | INT | Năm sản xuất |
| `seats` | INT | Số ghế |
| `fuel_type` | ENUM | XANG, DAU, DIEN, HYBRID |
| `status` | ENUM | SAN_SANG, DANG_CHAY, BAO_TRI, NGUNG_HOAT_DONG |
| `mileage` | INT | Số km |
| `last_maintenance`, `next_maintenance` | TIMESTAMP | |
| `total_trips` | INT | |

#### `trips` — Chuyến đi

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `vehicle_id`, `vehicle_name` | BIGINT, VARCHAR | FK đến xe |
| `driver_id`, `driver_name` | BIGINT, VARCHAR | FK đến tài xế |
| `customer_name`, `customer_phone` | VARCHAR | Thông tin khách |
| `pickup_location`, `pickup_province_code`, `pickup_ward_code` | VARCHAR | Điểm đón |
| `dropoff_location`, `dropoff_province_code`, `dropoff_ward_code` | VARCHAR | Điểm trả |
| `pickup_time` | TIMESTAMP | Giờ đón dự kiến |
| `dropoff_time` | TIMESTAMP | Giờ trả thực tế |
| `price` | DECIMAL | Giá vé |
| `distance` | INT | Khoảng cách (km) |
| `passengers` | INT | Số hành khách |
| `full_vehicle` | BOOLEAN | Thuê cả xe |
| `status` | ENUM | CHO_XAC_NHAN → DA_XAC_NHAN → DA_GHEP_CHUYEN → DA_PHAN_XE → DANG_DON → DANG_DI → HOAN_THANH / DA_HUY |
| `group_id` | VARCHAR(64) | Mã nhóm ghép chuyến (thực tế là `trip_groups.id`) |
| `pickup_confirmed`, `dropoff_confirmed` | BOOLEAN | Xác nhận đón/trả |
| `confirmed_at`, `assigned_at`, `started_at`, `completed_at` | TIMESTAMP | Timestamp theo trạng thái |
| `notes`, `rating` | TEXT, INT | |

#### `trip_groups` — Nhóm Ghép Chuyến

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `name` | VARCHAR(255) | Tên nhóm |
| `trip_ids` | VARCHAR(1000) | Danh sách `ID` chuyến, phân cách bằng dấu phẩy |
| `vehicle_id`, `vehicle_name` | BIGINT, VARCHAR | Xe cho nhóm |
| `driver_id`, `driver_name` | BIGINT, VARCHAR | Tài xế của nhóm |
| `status` | ENUM | DANG_GHEP → DA_PHAN_XE → DANG_CHAY → HOAN_THANH |
| `total_passengers` | INT | Tổng hành khách |
| `total_revenue` | DOUBLE | Tổng doanh thu nhóm |
| `pickup_date` | DATE | Ngày đón (dùng để filter hiệu quả) |

---

### 3.2 Finance — Tài chính

#### `trip_payments` — Thu Tiền Mặt từ Khách

Tài xế được khách trả tiền mặt tại điểm đón/trả.

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `trip_id` | BIGINT | Chuyến đi liên quan |
| `driver_id` | BIGINT | Tài xế thu tiền |
| `amount` | DOUBLE | Số tiền |
| `method` | ENUM | CASH |
| `collected_at` | TIMESTAMP | Thời điểm thu |

> **Tác động**: tăng `outstanding_balance` của tài xế → ghi vào `driver_transactions` (DEBIT / TRIP_CASH_COLLECTED)

---

#### `deposit_records` — Tài Xế Nộp Tiền về Công Ty

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `driver_id` | BIGINT | |
| `trip_id` | BIGINT | Chuyến liên quan (nếu có) |
| `amount` | DOUBLE | |
| `payment_method` | ENUM | **CASH, TRANSFER** |
| `note` | VARCHAR | |
| `created_at` | TIMESTAMP | |

> **Tác động**: giảm `outstanding_balance` của tài xế → ghi vào `driver_transactions` (CREDIT / DEPOSIT_TO_COMPANY)

---

#### `customer_advance_payments` — Khách Ứng Trước

Khách thanh toán trước cho công ty (CHUYỂN KHOẢN thẳng cho hệ thống, không qua tài xế).

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `trip_id` | BIGINT | Chuyến liên quan |
| `customer_name`, `customer_phone` | VARCHAR | |
| `amount` | DOUBLE | |
| `method` | ENUM | CASH, TRANSFER |
| `status` | ENUM | PENDING → SUBMITTED → RECONCILED / REJECTED |
| `collected_by` | BIGINT | Người ghép phiếu |
| `submitted_by`, `submitted_at` | | Kế toán gửi đối soát |
| `reconciled_by`, `reconciled_at` | | Admin xác nhận đối soát |
| `receipt_code` | VARCHAR(64) | Mã chứng từ |

> **Trạng thái RECONCILED**: giảm `outstanding_balance` của tài xế có chuyến đó → ghi vào `driver_transactions` (CREDIT / CUSTOMER_ADVANCED)

---

#### `driver_expense_advances` — Tài Xế Ứng Chi Phí (Xăng, Phí, ...)

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `driver_id`, `trip_id` | BIGINT | |
| `amount` | DOUBLE | |
| `expense_type` | ENUM | TOLL, PARKING, FUEL, OTHER |
| `status` | ENUM | REQUESTED → APPROVED → TRANSFERRED → DEDUCTED / REJECTED |
| `requested_by`, `approved_by`, `transferred_by`, `deducted_by` | BIGINT | Actor theo từng bước |

> **Trạng thái TRANSFERRED**: công ty giải ngân → giảm `company_wallet`, tăng `outstanding_balance` tài xế → ghi `driver_transactions` (DEBIT / DRIVER_EXPENSE_ADVANCE)  
> **Trạng thái DEDUCTED**: giảm `outstanding_balance` tài xế → ghi `driver_transactions` (CREDIT / DRIVER_EXPENSE_ADVANCE)

---

#### `driver_transactions` — Sổ Quỹ Tài Xế ⭐ (Mới thêm)

**Bảng Ledger** ghi nhận toàn bộ biến động `outstanding_balance` của từng tài xế. Mỗi lần `outstanding_balance` thay đổi đều có 1 dòng ở đây.

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `driver_id` | BIGINT | Tài xế |
| `amount` | DOUBLE | Giá trị tuyệt đối |
| `transaction_type` | ENUM | `DEBIT` (nợ tăng), `CREDIT` (nợ giảm) |
| `reference_type` | ENUM | `TRIP_CASH_COLLECTED`, `DEPOSIT_TO_COMPANY`, `CUSTOMER_ADVANCED`, `DRIVER_EXPENSE_ADVANCE`, `INITIAL_BALANCE`, `MANUAL_ADJUSTMENT` |
| `reference_id` | BIGINT | ID của bản ghi gốc gây ra giao dịch |
| `description` | TEXT | Mô tả |
| `created_by` | BIGINT | Người thực hiện |
| `created_at` | TIMESTAMP | |
| `balance_after` | DOUBLE | Số dư sau giao dịch (snapshot) |

---

#### `company_wallets` — Ví Công Ty

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `name` | VARCHAR | Tên ví |
| `balance` | DOUBLE | Số dư hiện tại |
| `currency` | VARCHAR | VND |
| `description` | TEXT | |

#### `company_transactions` — Sổ Cái Ví Công Ty

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `wallet_id` | BIGINT | |
| `amount` | DOUBLE | |
| `transaction_type` | ENUM | INCOME, EXPENSE |
| `reference_type` | VARCHAR | Loại giao dịch gốc |
| `reference_id` | BIGINT | |
| `description` | TEXT | |
| `created_by` | BIGINT | |
| `balance_after` | DOUBLE | |

---

#### `expense_vouchers` — Phiếu Chi Nội Bộ

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `code` | VARCHAR(64) UNIQUE | Mã phiếu |
| `title` | VARCHAR(255) | Tiêu đề |
| `category` | ENUM | OFFICE_RENT, ELECTRICITY, WATER, SALARY, DRIVER_ADVANCE, OPERATIONS, OTHER |
| `amount` | DOUBLE | |
| `payee_name`, `payee_account` | VARCHAR | Người nhận |
| `status` | ENUM | DRAFT → PENDING → APPROVED → PAID / REJECTED |
| `wallet_id` | BIGINT | Ví chi |
| `driver_expense_advance_id` | BIGINT | Liên kết phiếu tạm ứng tài xế (nếu có) |
| `created_by`, `submitted_by`, `approved_by`, `rejected_by`, `paid_by` | BIGINT | |

#### `expense_voucher_histories` — Lịch Sử Phiếu Chi

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `voucher_id` | BIGINT | |
| `from_status` / `to_status` | ENUM | |
| `changed_by` | BIGINT | |
| `note` | TEXT | |
| `changed_at` | TIMESTAMP | |

#### `payment_attachments` — Ảnh Chứng Từ

| Column | Type | Mô tả |
|---|---|---|
| `id` | BIGINT PK | |
| `reference_type` | ENUM | TRIP_PAYMENT, DEPOSIT_RECORD, CUSTOMER_ADVANCE, DRIVER_EXPENSE_ADVANCE, EXPENSE_VOUCHER |
| `reference_id` | BIGINT | ID của bản ghi gốc |
| `file_name`, `content_type`, `size_bytes` | | |
| `storage_path` | VARCHAR | Đường dẫn lưu trữ (MinIO/local) |
| `expires_at` | TIMESTAMP | Thời gian hết hạn (blob cleanup) |

---

## 4. Quy Trình Nghiệp Vụ (Business Flows)

### 4.1 Vòng Đời Chuyến Đi

```
CHO_XAC_NHAN
   → DA_XAC_NHAN        (CALL_CENTER hoặc DISPATCHER xác nhận)
   → DA_GHEP_CHUYEN     (Đã ghép vào TripGroup)
   → DA_PHAN_XE         (Đã phân công xe)
   → DANG_DON           (Tài xế đang đón khách)
   → DANG_DI            (Đang trên đường)
   → HOAN_THANH         (Hoàn tất)
   → DA_HUY             (Hủy bất kỳ lúc nào)
```

### 4.2 Luồng Thu Tiền Mặt (Trip Payment)

```
Khách trả tiền mặt cho Tài xế
  → Tạo TripPayment
  → outstanding_balance tài xế +amount
  → DriverTransaction: DEBIT / TRIP_CASH_COLLECTED
```

### 4.3 Luồng Nộp Tiền (Deposit Record)

```
Tài xế nộp tiền về công ty
  → Tạo DepositRecord (với paymentMethod: CASH hoặc TRANSFER)
  → outstanding_balance tài xế -amount
  → DriverTransaction: CREDIT / DEPOSIT_TO_COMPANY
  → company_wallet +amount
  → CompanyTransaction: INCOME
```

### 4.4 Luồng Khách Ứng Trước (CustomerAdvancePayment)

```
Khách chuyển khoản trước cho công ty
  → Tạo CustomerAdvancePayment (PENDING)
  → SUBMITTED: kế toán xác nhận
  → RECONCILED:
      → company_wallet +amount
      → outstanding_balance tài xế (có chuyến đó) -amount
      → DriverTransaction: CREDIT / CUSTOMER_ADVANCED
```

### 4.5 Luồng Tài Xế Ứng Chi Phí (DriverExpenseAdvance)

```
REQUESTED → APPROVED (Admin)
          → TRANSFERRED (Kế toán)
              → company_wallet -amount
              → outstanding_balance tài xế +amount
              → DriverTransaction: DEBIT / DRIVER_EXPENSE_ADVANCE
          → DEDUCTED (Admin/Kế toán)
              → outstanding_balance tài xế -amount
              → DriverTransaction: CREDIT / DRIVER_EXPENSE_ADVANCE
          → REJECTED:
              (nếu đã TRANSFERRED: hoàn lại ví công ty)
```

> **Lưu ý**: Khi một `ExpenseVoucher` loại `DRIVER_ADVANCE` được chuyển sang `PAID`, hệ thống tự động gọi `updateDriverExpenseAdvanceStatus` để đặt phiếu liên kết sang `DEDUCTED`.

### 4.6 Luồng Phiếu Chi Nội Bộ (ExpenseVoucher)

```
DRAFT → PENDING (người tạo submit)
      → APPROVED (Admin duyệt)
      → PAID (Kế toán xác nhận chuyển tiền)
          → company_wallet -amount
          → CompanyTransaction: EXPENSE
          → nếu có driver_expense_advance_id → DriverExpenseAdvance chuyển DEDUCTED
      → REJECTED (ở bất kỳ bước nào)
```

### 4.7 Tính Dư Nợ Hàng Ngày Tài Xế (`getDailySummary`)

Công thức tính số tiền tài xế phải nộp trong ngày:

```
expectedAmount = SUM(trip.price - alreadyPaid - customerPrepaid)
                  (per trip, min 0)

  - alreadyPaid    = Tổng DepositRecord.amount gắn với chuyến đó
  - customerPrepaid = Tổng CustomerAdvancePayment.amount (trạng thái PENDING/SUBMITTED/RECONCILED) gắn với chuyến
```

---

## 5. API Endpoints

> **Base URL**: `/transport-service`  
> Tất cả endpoints yêu cầu xác thực JWT (trừ `/auth/**`).

### 5.1 Authentication

| Method | Path | Mô tả |
|---|---|---|
| POST | `/auth/login` | Đăng nhập, nhận JWT |
| POST | `/auth/refresh` | Làm mới token |

### 5.2 Trips (`/trips`)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/trips` | Tạo chuyến đi |
| GET | `/trips/{id}` | Chi tiết chuyến |
| GET | `/trips?status=&date=` | Tìm kiếm + lọc theo trạng thái / ngày |
| PUT | `/trips/{id}` | Cập nhật |
| DELETE | `/trips/{id}` | Xóa |

### 5.3 TripGroups (`/trip-groups`)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/trip-groups` | Tạo nhóm ghép chuyến |
| GET | `/trip-groups/{id}` | Chi tiết nhóm |
| GET | `/trip-groups?status=&date=` | Tìm kiếm |
| PUT | `/trip-groups/{id}` | Cập nhật |
| DELETE | `/trip-groups/{id}` | Xóa |
| POST | `/trip-groups/{id}/assign-vehicle?vehicleId=` | Phân công xe |
| POST | `/trip-groups/{id}/assign-driver?driverId=` | Phân công tài xế |
| POST | `/trip-groups/{id}/add-trip?tripId=` | Thêm chuyến vào nhóm |
| DELETE | `/trip-groups/{id}/remove-trip?tripId=` | Xóa chuyến khỏi nhóm |

### 5.4 Drivers (`/drivers`)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/drivers` | Tạo tài xế |
| GET | `/drivers/{id}` | Chi tiết |
| GET | `/drivers?q=` | Tìm kiếm theo từ khóa |
| PUT | `/drivers/{id}` | Cập nhật |
| DELETE | `/drivers/{id}` | Xóa |
| GET | `/drivers/{id}/daily-summary?date=yyyy-MM-dd` | **Công nợ + doanh thu trong ngày của tài xế** |

### 5.5 Payments (`/payments`)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/payments/trips` | Ghi nhận thu tiền mặt chuyến đi |
| GET | `/payments/trips/{id}` | Chi tiết |
| GET | `/payments/trips?driverId=` | Danh sách theo tài xế |
| DELETE | `/payments/trips/{id}` | Xóa |
| POST | `/payments/deposits` | Ghi nhận tài xế nộp tiền |
| GET | `/payments/deposits/{id}` | Chi tiết |
| GET | `/payments/deposits?driverId=` | Danh sách theo tài xế |
| DELETE | `/payments/deposits/{id}` | Xóa |
| POST | `/payments/customer-advances` | Ghi nhận khách ứng trước |
| PATCH | `/payments/customer-advances/{id}/status` | Cập nhật trạng thái đối soát |
| GET | `/payments/customer-advances?status=&tripId=` | Tìm kiếm |
| POST | `/payments/driver-advances` | Tạo phiếu tạm ứng chi phí tài xế |
| PATCH | `/payments/driver-advances/{id}/status` | Cập nhật trạng thái tạm ứng |
| GET | `/payments/driver-advances?driverId=&status=&from=&to=` | Tìm kiếm |
| GET | `/payments/summary?from=&to=` | **Tổng hợp kế toán toàn bộ tài xế** |
| GET | `/payments/attachments/{id}` | Tải file đính kèm chứng từ |

### 5.6 Expenses (`/expenses`)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/expenses/vouchers` | Tạo phiếu chi |
| PUT | `/expenses/vouchers/{id}` | Cập nhật phiếu chi (chỉ DRAFT) |
| PATCH | `/expenses/vouchers/{id}/status` | Chuyển trạng thái phiếu chi |
| GET | `/expenses/vouchers/{id}` | Chi tiết |
| GET | `/expenses/vouchers?status=&category=&from=&to=` | Tìm kiếm |
| GET | `/expenses/vouchers/{id}/history` | Lịch sử thay đổi trạng thái |
| GET | `/expenses/summary?from=&to=` | Tổng hợp chi tiêu |

---

## 6. Cấu trúc Project (Backend)

```
xeghepBE/src/main/java/com/brostech/transport
├── controller/          REST Controllers
│   ├── AuthController
│   ├── DriverController
│   ├── CustomerController
│   ├── VehicleController
│   ├── TripController
│   ├── TripGroupController
│   ├── PaymentController
│   ├── ExpenseVoucherController
│   ├── ReportController
│   └── DataMigrationController
├── service/             Business Logic Interfaces
│   └── impl/            Implementation Classes
├── jpa/
│   ├── entity/          JPA Entities (Database Tables)
│   └── repository/      Spring Data JPA Repositories
├── dto/                 Data Transfer Objects
│   ├── driver/
│   ├── expense/
│   ├── payment/
│   └── trip/
├── security/            JWT Auth + Spring Security
├── configuration/       App Config (CORS, MinIO, etc.)
├── aop/                 Aspect (Logging)
└── middleware/          Request Filters
```

---

## 7. Đề Xuất Cải Tiến Dự Án

Dưới đây là danh sách tính năng cần thiết hoặc cần nâng cấp, được ưu tiên theo mức độ quan trọng.

### 🔴 Mức Cao (Thiếu hoặc gây rủi ro nghiệp vụ)

| # | Tính năng | Mô tả |
|---|---|---|
| 1 | **API Ledger Tài xế** | Endpoint `GET /drivers/{id}/ledger` trả về toàn bộ lịch sử từ `driver_transactions`. Hiện tại chỉ có `outstandingBalance` snapshot. |
| 2 | **Migration Dư Nợ Đầu Kỳ** | Endpoint `POST /admin/migrate-initial-balance` để chuyển `outstandingBalance` hiện tại của tài xế cũ thành dòng `INITIAL_BALANCE` trong `driver_transactions`. |
| 3 | **Role-Based Access Control chặt hơn** | Hiện tại có kiểm tra quyền thủ công trong Service, nên chuyển sang `@PreAuthorize` + Spring Security để tái sử dụng và dễ bảo trì. |
| 4 | **Phân trang và tìm kiếm Driver Transactions** | Endpoint `GET /payments/driver-transactions?driverId=&from=&to=` để kịp thời tra soát lịch sử dư nợ. |
| 5 | **Xử lý đồng thời (Concurrency)** | Cần thêm Optimistic Locking (`@Version`) hoặc Pessimistic Lock trên `User.outstandingBalance` để tránh Race Condition khi nhiều giao dịch cùng xảy ra. |

### 🟡 Mức Trung Bình (Quan trọng nhưng có thể trì hoãn)

| # | Tính năng | Mô tả |
|---|---|---|
| 6 | **Export báo cáo Excel** | Kế toán cần xuất file `.xlsx` từ bảng tổng hợp tài xế, phiếu chi. Đã có `poi-ooxml` sẵn trong `pom.xml`. |
| 7 | **Bảng lịch sử trạng thái chuyến đi** | Thêm bảng `trip_status_histories` để lưu vết thay đổi trạng thái chuyến (tương tự `expense_voucher_histories`). |
| 8 | **Thông báo Push/Zalo OA** | Tự động gửi thông báo khi chuyến được xác nhận, tài xế được phân công, hoặc ứng tiền được duyệt. |
| 9 | **Tách biệt `Trip.price` thành cash_amount / prepaid_amount** | Làm rõ bao nhiêu tiền tài xế giữ, bao nhiêu đã được công ty nhận trực tiếp. Hiện tại phải join nhiều bảng để tính. |
| 10 | **Quản lý Bảo Dưỡng Xe** | Khi `next_maintenance` đã đến, tự động cảnh báo hoặc chuyển xe sang trạng thái `BAO_TRI`. |
| 11 | **Customer Portal** | Khách hàng tự đặt chuyến online, tra cứu trạng thái chuyến. |

### 🟢 Mức Thấp (Nice-to-have)

| # | Tính năng | Mô tả |
|---|---|---|
| 12 | **Dashboard Analytics** | Biểu đồ doanh thu theo ngày/tuần/tháng, tỉ lệ hoàn thành chuyến, xếp hạng tài xế. |
| 13 | **Soft Delete** | Thêm cột `deleted_at` thay vì xóa vĩnh viễn để tracing lịch sử. |
| 14 | **Audit Log chung** | Lưu mọi thao tác CRUD vào bảng `audit_logs` (ai, làm gì, khi nào, data cũ/mới). |
| 15 | **API Rate Limiting** | Bảo vệ các endpoint quan trọng tránh spam. |
| 16 | **Trip matching algorithm** | Tự động gợi ý ghép chuyến theo điểm đón, giờ đón, số khách. |

---

## 8. Ghi chú Kỹ thuật

- **Database DDL**: `spring.jpa.hibernate.ddl-auto: update` — Hibernate tự tạo/cập nhật schema khi khởi động.
- **File Storage**: Sử dụng MinIO (hoặc local filesystem) thông qua `PaymentAttachmentService`. File hết hạn theo `expires_at`.
- **Auth**: JWT Bearer Token. Token được validate bởi `JwtService` và filter trong `middleware/`.
- **Build**: Chạy bằng `JAVA_HOME=$(/usr/libexec/java_home -v 17) mvn clean install -DskipTests` do hệ thống có cả Java 17 và Java 25.
- **Swagger UI**: Available tại `/swagger-ui.html` (springdoc-openapi).
