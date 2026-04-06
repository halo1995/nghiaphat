# Hướng dẫn Migration Pagination

## Tóm tắt

Đã hoàn thành việc thêm pagination cho các trang admin. Các trang driver giữ nguyên infinite scroll.

## Đã hoàn thành ✅

### 1. Components
- ✅ `src/components/ui/pagination.tsx` - Base pagination component (shadcn/ui)
- ✅ `src/components/PaginationControls.tsx` - Custom pagination với page size selector

### 2. Data Layer
- ✅ `src/data/customers.ts` - Thêm `getCustomersPaginated()`
- ✅ `src/data/drivers.ts` - Thêm `getDriversPaginated()`
- ✅ `src/data/vehicles.ts` - Thêm `getVehiclesPaginated()`

### 3. Pages đã cập nhật
- ✅ `src/pages/Customers.tsx` - Server-side pagination
- ✅ `src/pages/Drivers.tsx` - Server-side pagination
- ✅ `src/pages/CallCenter.tsx` - Client-side pagination (do có nhiều filter phức tạp)

## Cần hoàn thành 🔄

### 4. VehicleList Page
File: `src/pages/VehicleList.tsx`

**Thay đổi cần thiết:**

```typescript
// Import thêm
import { getVehiclesPaginated } from '@/data/vehicles';
import { PaginationControls } from '@/components/PaginationControls';
import { useQuery } from '@tanstack/react-query';

// Thêm state
const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(20);

// Thay đổi query
const { data, isLoading } = useQuery({
  queryKey: ['vehicles', 'paginated', page, pageSize, searchTerm, statusFilter],
  queryFn: () => getVehiclesPaginated(page, pageSize, searchTerm || undefined),
});

const vehicles = data?.vehicles || [];
const totalPages = data?.totalPages || 0;
const totalElements = data?.totalElements || 0;

// Filter theo status ở client (hoặc có thể thêm vào API)
const filteredVehicles = vehicles.filter(vehicle => {
  const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
  return matchesStatus;
});

// Reset page khi filter thay đổi
const handleSearchChange = (value: string) => {
  setSearchTerm(value);
  setPage(0);
};

const handleStatusChange = (value: string) => {
  setStatusFilter(value);
  setPage(0);
};

// Thêm pagination vào UI (sau grid)
<PaginationControls
  currentPage={page}
  totalPages={totalPages}
  pageSize={pageSize}
  totalItems={totalElements}
  onPageChange={setPage}
  onPageSizeChange={(size) => {
    setPageSize(size);
    setPage(0);
  }}
/>
```

### 5. Users Page (nếu có)
File: `src/pages/Users.tsx`

Tương tự như Customers/Drivers:
1. Thêm `getUsersPaginated()` trong `src/data/users.ts`
2. Thêm state page, pageSize
3. Sử dụng useQuery với pagination
4. Thêm PaginationControls

### 6. DriverAdvances Page
File: `src/pages/DriverAdvances.tsx`

Kiểm tra xem có cần pagination không (nếu danh sách dài)

### 7. ExpenseVouchers Page
File: `src/pages/ExpenseVouchers.tsx`

Kiểm tra xem có cần pagination không

## Pages GIỮ NGUYÊN (Mobile/Driver) 📱

Các trang sau KHÔNG thay đổi, giữ nguyên infinite scroll hoặc load all:

- ✅ `src/pages/DriverDashboard.tsx` - Driver mobile view
- ✅ `src/pages/DriverTrips.tsx` - Driver mobile view
- ✅ `src/pages/DriverLedger.tsx` - Đã có pagination sẵn

## Pattern chung

### Server-side Pagination (Recommended)
```typescript
// 1. Data function
export const getItemsPaginated = async (page = 0, size = 20, query?: string) => {
  const response = await apiService.searchItems(query, page, size);
  return {
    items: response.content.map(mapItem),
    totalPages: response.pageable.totalPages,
    totalElements: response.pageable.totalElements,
    currentPage: response.pageable.pageNumber,
    pageSize: response.pageable.pageSize,
  };
};

// 2. Component
const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(20);
const [searchTerm, setSearchTerm] = useState('');

const { data, isLoading } = useQuery({
  queryKey: ['items', 'paginated', page, pageSize, searchTerm],
  queryFn: () => getItemsPaginated(page, pageSize, searchTerm || undefined),
});

// 3. Reset page on filter change
useEffect(() => {
  setPage(0);
}, [searchTerm, otherFilters]);

// 4. UI
<PaginationControls
  currentPage={page}
  totalPages={data?.totalPages || 0}
  pageSize={pageSize}
  totalItems={data?.totalElements || 0}
  onPageChange={setPage}
  onPageSizeChange={(size) => {
    setPageSize(size);
    setPage(0);
  }}
/>
```

### Client-side Pagination (Khi có nhiều filter phức tạp)
```typescript
// Filter trước
const filteredItems = useMemo(() => {
  return items.filter(/* complex filters */);
}, [items, filters]);

// Pagination sau
const totalPages = Math.ceil(filteredItems.length / pageSize);
const paginatedItems = useMemo(() => {
  const start = page * pageSize;
  return filteredItems.slice(start, start + pageSize);
}, [filteredItems, page, pageSize]);

// Reset page khi filter thay đổi
useEffect(() => {
  setPage(0);
}, [filters]);
```

## Testing Checklist

Sau khi hoàn thành migration, test các trường hợp:

- [ ] Pagination hoạt động đúng (next/prev/số trang)
- [ ] Page size selector hoạt động
- [ ] Search/filter reset về trang 1
- [ ] Hiển thị đúng số lượng items
- [ ] URL có thể bookmark (nếu cần)
- [ ] Performance tốt (không load dư thừa)
- [ ] Mobile responsive
- [ ] Keyboard navigation (nếu cần)

## Notes

- Backend đã hỗ trợ pagination với Spring Data Pageable
- ApiResponse interface đã có đầy đủ thông tin pagination
- PaginationControls component đã handle edge cases (page 0, last page, etc.)
- Debounce search để tránh gọi API quá nhiều (nếu cần)
