# Driver Advances Date Filter Implementation

## Tóm tắt
Đã thêm filter theo khoảng thời gian (date range) cho endpoint `/transport-service/payments/driver-advances`.

## Các thay đổi

### 1. Repository Layer ✅
**File**: `DriverExpenseAdvanceRepository.java`

Thêm các query methods mới:
- `findByRequestedAtBetween(Date from, Date to, Pageable)` - Filter theo date range
- `findByDriverIdAndRequestedAtBetween(...)` - Filter theo driver + date range
- `findByStatusAndRequestedAtBetween(...)` - Filter theo status + date range
- `findByDriverIdAndStatusAndRequestedAtBetween(...)` - Filter theo driver + status + date range

### 2. Service Layer ✅
**File**: `PaymentService.java` và `PaymentServiceImpl.java`

- Cập nhật method signature: `searchDriverExpenseAdvances(Long driverId, String status, String from, String to, Pageable)`
- Thêm logic xử lý date range filtering
- Thêm helper method `parseDate(String)` để parse date parameters

### 3. Controller Layer ✅
**File**: `PaymentController.java`

Thêm query parameters mới:
- `from` (optional): Ngày bắt đầu (format: `yyyy-MM-dd` hoặc `yyyy-MM-dd HH:mm:ss`)
- `to` (optional): Ngày kết thúc (format: `yyyy-MM-dd` hoặc `yyyy-MM-dd HH:mm:ss`)

## API Usage

### Endpoint
```
GET /transport-service/payments/driver-advances
```

### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| driverId | Long | No | Filter theo ID tài xế | `123` |
| status | String | No | Filter theo trạng thái | `REQUESTED`, `APPROVED`, `TRANSFERRED`, `DEDUCTED`, `REJECTED` |
| from | String | No | Ngày bắt đầu | `2024-12-01` hoặc `2024-12-01 00:00:00` |
| to | String | No | Ngày kết thúc | `2024-12-31` hoặc `2024-12-31 23:59:59` |
| page | Integer | No | Số trang (default: 0) | `0` |
| size | Integer | No | Kích thước trang (default: 20) | `20` |
| sort | String | No | Sắp xếp | `requestedAt,desc` |

### Examples

#### 1. Lấy tất cả driver advances trong tháng 12/2024
```bash
curl "http://localhost:8080/transport-service/payments/driver-advances?from=2024-12-01&to=2024-12-31"
```

#### 2. Lấy driver advances của tài xế cụ thể trong khoảng thời gian
```bash
curl "http://localhost:8080/transport-service/payments/driver-advances?driverId=123&from=2024-12-01&to=2024-12-31"
```

#### 3. Lấy driver advances theo status và date range
```bash
curl "http://localhost:8080/transport-service/payments/driver-advances?status=APPROVED&from=2024-12-01&to=2024-12-31"
```

#### 4. Kết hợp tất cả filters
```bash
curl "http://localhost:8080/transport-service/payments/driver-advances?driverId=123&status=TRANSFERRED&from=2024-12-01&to=2024-12-31&page=0&size=10&sort=requestedAt,desc"
```

#### 5. Không có date filter (hoạt động như cũ)
```bash
curl "http://localhost:8080/transport-service/payments/driver-advances?driverId=123&status=REQUESTED"
```

## Date Format

Hỗ trợ 2 formats:
1. **Date only**: `yyyy-MM-dd` (ví dụ: `2024-12-01`)
   - `from`: Tự động thêm `00:00:00`
   - `to`: Tự động thêm `23:59:59`

2. **Date with time**: `yyyy-MM-dd HH:mm:ss` (ví dụ: `2024-12-01 14:30:00`)
   - Sử dụng chính xác thời gian được cung cấp

## Filter Logic

Các filters được kết hợp theo logic AND:
- Nếu có `from` và `to`: Filter theo `requestedAt BETWEEN from AND to`
- Nếu có `driverId`: Filter theo driver
- Nếu có `status`: Filter theo status
- Tất cả filters có thể kết hợp với nhau

## Testing

### Test Cases

1. **Filter theo date range only**
   ```bash
   curl "http://localhost:8080/transport-service/payments/driver-advances?from=2024-12-01&to=2024-12-31"
   ```
   Expected: Trả về tất cả advances trong tháng 12/2024

2. **Filter theo driver + date range**
   ```bash
   curl "http://localhost:8080/transport-service/payments/driver-advances?driverId=123&from=2024-12-01&to=2024-12-31"
   ```
   Expected: Trả về advances của driver 123 trong tháng 12/2024

3. **Filter theo status + date range**
   ```bash
   curl "http://localhost:8080/transport-service/payments/driver-advances?status=APPROVED&from=2024-12-01&to=2024-12-31"
   ```
   Expected: Trả về advances có status APPROVED trong tháng 12/2024

4. **Tất cả filters**
   ```bash
   curl "http://localhost:8080/transport-service/payments/driver-advances?driverId=123&status=TRANSFERRED&from=2024-12-01&to=2024-12-31"
   ```
   Expected: Trả về advances của driver 123, status TRANSFERRED, trong tháng 12/2024

5. **Invalid date format**
   ```bash
   curl "http://localhost:8080/transport-service/payments/driver-advances?from=invalid-date"
   ```
   Expected: HTTP 400 với message "Invalid date format"

6. **Backward compatibility (không có date filter)**
   ```bash
   curl "http://localhost:8080/transport-service/payments/driver-advances?driverId=123"
   ```
   Expected: Trả về tất cả advances của driver 123 (không filter theo date)

## Database Query Performance

Các query sử dụng index trên cột `requested_at` để tối ưu hiệu suất.

Nếu cần, có thể thêm composite index:
```sql
CREATE INDEX idx_driver_advances_driver_status_date 
ON driver_expense_advances(driver_id, status, requested_at);
```

## Files Modified

1. `xeghepBE/src/main/java/com/brostech/transport/jpa/repository/DriverExpenseAdvanceRepository.java`
2. `xeghepBE/src/main/java/com/brostech/transport/service/PaymentService.java`
3. `xeghepBE/src/main/java/com/brostech/transport/service/impl/PaymentServiceImpl.java`
4. `xeghepBE/src/main/java/com/brostech/transport/controller/PaymentController.java`

## Backward Compatibility

✅ Hoàn toàn backward compatible - các API calls hiện tại không có `from`/`to` parameters vẫn hoạt động bình thường.

## Notes

- Date filtering dựa trên field `requestedAt` (ngày tạo yêu cầu tạm ứng)
- Nếu chỉ cung cấp `from` hoặc chỉ `to`, filter sẽ không được áp dụng (cần cả 2 parameters)
- Pagination và sorting vẫn hoạt động bình thường với date filtering
