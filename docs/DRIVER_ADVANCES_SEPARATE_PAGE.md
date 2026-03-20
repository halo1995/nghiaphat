# Driver Advances - Separate Page Implementation

## Tóm tắt
Tách phần "Lịch sử tạm ứng" ra thành một page riêng `/driver/advances` thay vì hiển thị trong DriverDashboard.

## Lý do thay đổi
- **Tổ chức tốt hơn**: Dashboard tập trung vào lịch trình chuyến đi
- **Performance**: Không cần load toàn bộ lịch sử tạm ứng khi chỉ xem lịch trình
- **UX tốt hơn**: Page riêng cho phép hiển thị nhiều thông tin và filter chi tiết hơn
- **Scalability**: Dễ dàng mở rộng thêm tính năng cho tạm ứng

## Các thay đổi

### 1. Tạo Page Mới ✅
**File**: `xeghepFE/src/pages/DriverAdvances.tsx`

**Features**:
- Hiển thị danh sách tạm ứng với date filter (mặc định 30 ngày)
- Stats cards: Tổng yêu cầu, Chờ duyệt, Đã duyệt, Đã khấu trừ
- Responsive design (mobile cards, desktop table)
- Button "Tải lại" để refresh data
- Hiển thị attachments với download links
- Navigation qua sidebar (không cần button "Quay lại")

### 2. Thêm Route ✅
**File**: `xeghepFE/src/App.tsx`

```typescript
<Route path="/driver/advances" element={<RoleRoute allowed={["driver"]}><DriverAdvances /></RoleRoute>} />
```

### 3. Cập nhật Dashboard ✅
**File**: `xeghepFE/src/pages/DriverDashboard.tsx`

**Thay đổi**:
- Xóa toàn bộ UI hiển thị danh sách tạm ứng
- Xóa date filter cho advances
- Xóa card link (đã chuyển sang sidebar)
- Giữ lại stats cards cho tạm ứng (Đã duyệt, Đang chờ)

### 4. Thêm vào Sidebar Navigation ✅
**File**: `xeghepFE/src/components/AppSidebar.tsx`

**Thay đổi**:
- Thêm menu item "Lịch Sử Tạm Ứng" với icon Wallet
- Chỉ hiển thị cho role driver
- Link đến `/driver/advances`

## Navigation Flow

```
Sidebar (Driver Menu)
  ├─ Lịch Trình Của Tôi → /driver
  └─ Lịch Sử Tạm Ứng → /driver/advances

/driver (Dashboard)
  ├─ Stats cards (Tổng chuyến, Sắp đi, Đang chạy, Hoàn thành)
  ├─ Stats cards (Tạm ứng đã duyệt, Tạm ứng đang chờ)
  └─ Danh sách chuyến đi

/driver/advances (Advances Page)
  ├─ Stats cards (Tổng yêu cầu, Chờ duyệt, Đã duyệt, Đã khấu trừ)
  ├─ Date filter (30 ngày mặc định)
  └─ Danh sách tạm ứng chi tiết
  
Note: Navigation giữa pages qua sidebar menu
```

## UI Components

### DriverDashboard Stats
- Tổng chuyến
- Sắp đi
- Đang chạy
- Hoàn thành
- **Tạm ứng đã duyệt** (từ query summary)
- **Tạm ứng đang chờ** (từ query summary)

### DriverAdvances Stats
- Tổng yêu cầu (count + amount)
- Chờ duyệt (count + amount)
- Đã duyệt (count + amount)
- Đã khấu trừ (count + amount)

## API Calls

### DriverDashboard
```typescript
// Chỉ query để lấy summary stats
useQuery({
  queryKey: ['driver-expense-advances-summary', driverId],
  queryFn: () => getDriverExpenseAdvances({ driverId }),
  // Không có date filter
});
```

### DriverAdvances
```typescript
// Query với date filter
useQuery({
  queryKey: ['driver-expense-advances', driverId, dateFrom, dateTo],
  queryFn: () => getDriverExpenseAdvances({ 
    driverId,
    from: dateFromObj,
    to: dateToObj,
  }),
});
```

## Files Created
- `xeghepFE/src/pages/DriverAdvances.tsx` - Page mới cho lịch sử tạm ứng

## Files Modified
- `xeghepFE/src/App.tsx` - Thêm route `/driver/advances`
- `xeghepFE/src/pages/DriverDashboard.tsx` - Xóa UI danh sách và card link
- `xeghepFE/src/components/AppSidebar.tsx` - Thêm menu item "Lịch Sử Tạm Ứng"

## Benefits

### Performance
- Dashboard load nhanh hơn (không cần load toàn bộ advances)
- Advances page chỉ load khi cần

### User Experience
- Dashboard clean hơn, tập trung vào chuyến đi
- Advances page có nhiều không gian để hiển thị thông tin chi tiết
- Dễ dàng navigate giữa 2 pages

### Maintainability
- Code tách biệt rõ ràng
- Dễ dàng thêm features cho mỗi page
- Không bị conflict giữa 2 concerns

## Testing

### Test Cases

1. **Sidebar Navigation**
   - Login as driver
   - Verify: Sidebar hiển thị 2 menu items
     - "Lịch Trình Của Tôi"
     - "Lịch Sử Tạm Ứng"
   - Click "Lịch Sử Tạm Ứng"
   - Verify: Navigate đến `/driver/advances`

2. **Advances Page - Load**
   - Mở `/driver/advances`
   - Verify: Stats cards hiển thị đúng
   - Verify: Danh sách tạm ứng 30 ngày gần đây

3. **Advances Page - Date filter**
   - Thay đổi date range
   - Verify: Danh sách update theo filter

4. **Responsive**
   - Test mobile: Cards layout
   - Test desktop: Table layout

## Notes

- Dashboard vẫn query advances để hiển thị summary stats (pending, outstanding)
- Advances page query riêng với date filter
- Cả 2 pages đều responsive
- Navigation qua sidebar menu (không cần button "Quay lại")
- Menu item "Lịch Sử Tạm Ứng" chỉ hiển thị cho driver role
- Sidebar luôn visible nên dễ dàng switch giữa các pages
