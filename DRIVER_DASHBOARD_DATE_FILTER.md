# Driver Dashboard - Date Filter for Advances

## Tóm tắt
Đã thêm date filter (từ ngày - đến ngày) cho phần "Lịch sử tạm ứng" trong màn hình Driver Dashboard.

## Các thay đổi

### 1. Backend ✅
Đã hoàn thành trong DRIVER_ADVANCES_DATE_FILTER.md
- Endpoint `/transport-service/payments/driver-advances` đã hỗ trợ `from` và `to` parameters

### 2. Frontend API Service ✅
**File**: `xeghepFE/src/services/apiService.ts`

Cập nhật method `getDriverExpenseAdvances`:
```typescript
async getDriverExpenseAdvances(
  driverId?: number,
  status?: string,
  from?: string,      // ✅ Thêm mới
  to?: string,        // ✅ Thêm mới
  page: number = 0,
  size: number = 100,
): Promise<ApiResponse<DriverExpenseAdvanceResponse>>
```

### 3. Frontend Data Layer ✅
**File**: `xeghepFE/src/data/accounting.ts`

Cập nhật function `getDriverExpenseAdvances`:
```typescript
export const getDriverExpenseAdvances = async (options?: {
  driverId?: string;
  status?: DriverExpenseStatus;
  from?: Date;        // ✅ Thêm mới
  to?: Date;          // ✅ Thêm mới
  page?: number;
  size?: number;
}): Promise<DriverExpenseAdvance[]>
```

### 4. Frontend UI ✅
**File**: `xeghepFE/src/pages/DriverDashboard.tsx`

**Thêm state cho date filter với giá trị mặc định**:
```typescript
// Mặc định lấy 30 ngày gần đây
const getDefaultAdvanceDateRange = () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  return {
    from: thirtyDaysAgo.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  };
};

const defaultAdvanceRange = useMemo(() => getDefaultAdvanceDateRange(), []);
const [advanceDateFrom, setAdvanceDateFrom] = useState<string>(defaultAdvanceRange.from);
const [advanceDateTo, setAdvanceDateTo] = useState<string>(defaultAdvanceRange.to);
```

**Cập nhật query**:
```typescript
const {
  data: driverAdvancesData = [],
  // ...
} = useQuery({
  queryKey: ['driver-expense-advances', driverId, advanceDateFrom, advanceDateTo],
  queryFn: () => getDriverExpenseAdvances({ 
    driverId,
    from: advanceDateFromObj,
    to: advanceDateToObj,
  }),
  // ...
});
```

**Thêm UI date pickers**:
- 2 DatePickerField components (Từ ngày, Đến ngày) với giá trị mặc định 30 ngày gần đây
- Button "30 ngày gần đây" để reset về mặc định

## UI Changes

### Trước
```
┌─────────────────────────────────────────┐
│ Lịch sử tạm ứng của tôi                 │
│ Theo dõi trạng thái phê duyệt và khấu trừ│
├─────────────────────────────────────────┤
│ [Danh sách tạm ứng...]                  │
└─────────────────────────────────────────┘
```

### Sau
```
┌─────────────────────────────────────────┐
│ Lịch sử tạm ứng của tôi                 │
│ Theo dõi trạng thái phê duyệt và khấu trừ│
│                                         │
│ [Từ ngày: 01/12 ▼] [Đến ngày: 31/12 ▼] [30 ngày gần đây] │
├─────────────────────────────────────────┤
│ [Danh sách tạm ứng 30 ngày gần đây...] │
└─────────────────────────────────────────┘
```

## Cách sử dụng

### 1. Xem 30 ngày gần đây (mặc định)
- Khi mở trang, tự động hiển thị tạm ứng trong 30 ngày gần đây
- Từ ngày: Hôm nay - 30 ngày
- Đến ngày: Hôm nay

### 2. Lọc theo khoảng thời gian tùy chỉnh
- Chọn "Từ ngày": 01/12/2024
- Chọn "Đến ngày": 31/12/2024
- Hiển thị tạm ứng trong tháng 12/2024

### 3. Reset về mặc định
- Click button "30 ngày gần đây"
- Reset về 30 ngày gần đây

## Responsive Design

### Mobile
- Date pickers xếp dọc (flex-col)
- Button "Xóa lọc" full width

### Desktop
- Date pickers xếp ngang (flex-row)
- Button "Xóa lọc" auto width

## Query Caching

React Query tự động cache kết quả theo:
- `driverId`
- `advanceDateFrom`
- `advanceDateTo`

Khi thay đổi bất kỳ giá trị nào, query sẽ tự động refetch.

## Files Modified

1. `xeghepFE/src/services/apiService.ts` - Thêm from/to parameters
2. `xeghepFE/src/data/accounting.ts` - Cập nhật getDriverExpenseAdvances
3. `xeghepFE/src/pages/DriverDashboard.tsx` - Thêm UI date filters

## Testing

### Test Cases

1. **Mặc định 30 ngày gần đây**
   - Mở trang Driver Dashboard
   - Verify: Date pickers hiển thị 30 ngày gần đây
   - Verify: Danh sách tạm ứng chỉ hiển thị 30 ngày gần đây

2. **Filter theo khoảng thời gian tùy chỉnh**
   - Chọn từ ngày: 01/12/2024
   - Chọn đến ngày: 31/12/2024
   - Verify: Chỉ hiển thị tạm ứng trong tháng 12

3. **Reset về mặc định**
   - Sau khi đã filter tùy chỉnh
   - Click "30 ngày gần đây"
   - Verify: Reset về 30 ngày gần đây

4. **Clear date picker**
   - Click clear (x) trên date picker
   - Verify: Date bị xóa, query vẫn gọi với date còn lại

5. **Responsive**
   - Test trên mobile: Date pickers xếp dọc
   - Test trên desktop: Date pickers xếp ngang

## Notes

- **Mặc định**: Tự động lọc 30 ngày gần đây khi mở trang
- Date filter dựa trên field `requestedAt` (ngày tạo yêu cầu)
- Cả 2 dates (from và to) luôn có giá trị
- Date format: `yyyy-MM-dd`
- Query tự động refetch khi thay đổi dates
- Button "30 ngày gần đây" giúp nhanh chóng reset về khoảng thời gian mặc định
