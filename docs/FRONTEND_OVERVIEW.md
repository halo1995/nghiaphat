# 🖥️ Tổng quan Frontend — Xeghep FE

> **Cập nhật lần cuối**: 2026-03-20  
> **Tech Stack**: React 18 · TypeScript · Vite · TailwindCSS · shadcn/ui · React Router v7 · TanStack Query

---

## 1. Công Nghệ Sử Dụng

| Thư viện | Version | Mục đích |
|---|---|---|
| `react` | 18.3 | UI framework |
| `typescript` | 5.8 | Type safety |
| `vite` | 6.3 | Build tool & dev server |
| `tailwindcss` | 3.4 | CSS utility-first |
| `@radix-ui/*` | nhiều | Headless UI Primitives (shadcn/ui) |
| `react-router-dom` | 7.6 | Routing |
| `@tanstack/react-query` | 5.76 | Server state caching & fetching |
| `react-hook-form` + `zod` | 7.x/3.x | Form validation |
| `lucide-react` | 0.51 | Icon library |
| `recharts` | 2.15 | Biểu đồ |
| `framer-motion` | 12.x | Animation |
| `date-fns` | 3.x | Xử lý ngày tháng |
| `sonner` | 2.x | Toast notifications |

**Build & Deploy**: Vite build → Nginx (Dockerfile có sẵn), deploy qua Docker Compose.

---

## 2. Cấu Trúc Thư Mục

```
xeghepFE/src/
├── App.tsx               Routing root + Layout
├── main.tsx              Điểm khởi động
├── index.css             Global styles (Tailwind)
├── pages/               Các màn hình chính (1 file = 1 màn hình)
│   ├── accounting/       Sub-pages kế toán
│   └── ...
├── components/           Shared components
│   ├── AppSidebar.tsx    Sidebar navigation
│   ├── ProtectedRoute.tsx
│   └── ui/              shadcn/ui components (auto-generated)
├── contexts/
│   └── AuthContext.tsx   Auth state toàn cục (user, token)
├── services/
│   ├── api.ts            Định nghĩa TypeScript types / interfaces
│   └── apiService.ts     Các hàm gọi API (fetch wrapper)
├── hooks/                Custom hooks
├── lib/                  Utility functions
├── utils/                Các hàm tiện ích
└── data/                 Static data (data cứng)
```

---

## 3. Authentication

- **Cơ chế**: JWT Bearer Token lưu trong `localStorage` (`token`, `user`).
- **`AuthContext`**: React Context cung cấp `user`, `token`, `login()`, `logout()`, `isAuthenticated`, `isLoading` cho toàn bộ app.
- **`ProtectedRoute`**: Redirect về `/login` nếu chưa đăng nhập.
- **`RoleRoute`**: Redirect về màn hình phù hợp với role nếu truy cập trang không được phép.
- **Auto logout**: Khi server trả về `401 Unauthorized`, app tự dispatch event `auth:unauthorized` để logout.

- **Fallback redirect theo role**:

| Role | Trang mặc định |
|---|---|
| `ADMIN` | `/` (Dashboard) |
| `DISPATCHER` | `/dispatch` |
| `CALL_CENTER` | `/call-center` |
| `DRIVER` | `/driver` |
| `ACCOUNTANT` | `/accounting` |

---

## 4. Màn Hình & Routing

### 4.1 Public

| Path | Page | Mô tả |
|---|---|---|
| `/login` | `Login.tsx` | Đăng nhập hệ thống |
| `/api-test` | `ApiTest.tsx` | Debug tool (dev only) |

### 4.2 Tổng Đài (`CALL_CENTER`, `ADMIN`)

| Path | Page | Tính năng chính |
|---|---|---|
| `/call-center` | `CallCenter.tsx` | Danh sách chuyến, tìm kiếm theo ngày/trạng thái, xác nhận chuyến, thêm ứng trước khách hàng |
| `/create-booking` | `CreateBooking.tsx` | Tạo mới đặt chuyến, chọn điểm đón/trả, chọn giờ, nhập thông tin khách |

### 4.3 Điều Phối (`DISPATCHER`, `ADMIN`)

| Path | Page | Tính năng chính |
|---|---|---|
| `/dispatch` | `Dispatch.tsx` | Xem các chuyến cần điều phối, ghép nhóm, xem trạng thái xe/tài xế |
| `/group-trips` | `GroupTrips.tsx` | Quản lý nhóm ghép chuyến (TripGroup), lọc theo ngày/trạng thái |
| `/assign-vehicle/:groupId` | `AssignVehicle.tsx` | Phân công xe + tài xế cho 1 nhóm chuyến |

### 4.4 Tài Xế (`DRIVER`, `ADMIN`)

| Path | Page | Tính năng chính |
|---|---|---|
| `/driver` | `DriverDashboard.tsx` | Xem lịch chuyến trong ngày, tổng thu nhập, công nợ hôm nay, thu tiền mặt khách, nộp tiền về công ty |
| `/driver/advances` | `DriverAdvances.tsx` | Tài xế xem và yêu cầu tạm ứng chi phí (xăng, phí cầu đường, ...) |
| `/driver-trips` | `DriverTrips.tsx` | Danh sách chuyến của tài xế |
| `/trip-execution/:tripId` | `TripExecution.tsx` | Tài xế thực hiện chuyến: xác nhận đón/trả khách, cập nhật trạng thái chuyến |

### 4.5 Quản Lý (`ADMIN` only)

| Path | Page | Tính năng chính |
|---|---|---|
| `/` | `Index.tsx` | Dashboard tổng quan (stats, charts) |
| `/vehicles` | `VehicleList.tsx` | Danh sách xe |
| `/vehicle/:id` | `VehicleDetail.tsx` | Chi tiết xe |
| `/add-vehicle` | `AddVehicle.tsx` | Thêm xe mới |
| `/edit-vehicle/:id` | `EditVehicle.tsx` | Sửa thông tin xe |
| `/drivers` | `Drivers.tsx` | Danh sách tài xế |
| `/drivers/add` | `AddDriver.tsx` | Thêm tài xế |
| `/customers` | `Customers.tsx` | Danh sách khách hàng |
| `/customers/add` | `AddCustomer.tsx` | Thêm khách hàng |
| `/users` | `Users.tsx` | Quản trị tài khoản người dùng |

### 4.6 Kế Toán (`ACCOUNTANT`, `ADMIN`)

| Path | Page | Tính năng chính |
|---|---|---|
| `/accounting` | `Accounting.tsx` | Tổng hợp doanh thu/dư nợ tài xế, đối soát khách ứng trước, thu tiền theo ngày |
| `/accounting/expenses` | `ExpenseVouchers.tsx` | Quản lý phiếu chi nội bộ (tạo, duyệt, thanh toán), xem lịch sử |

### 4.7 Chung

| Path | Page |
|---|---|
| `/change-password` | `ChangePassword.tsx` |
| `*` | `NotFound.tsx` |

---

## 5. Luồng API (services/)

### `api.ts` — TypeScript Interfaces

Định nghĩa toàn bộ Request/Response interfaces, mapped 1-1 với Backend API. Bao gồm:

- `TripResponse`, `TripRequest`
- `TripGroupResponse`, `TripGroupRequest`
- `DriverResponse`, `DriverRequest`
- `VehicleResponse`, `VehicleRequest`
- `CustomerResponse`, `CustomerRequest`
- `TripPaymentResponse`, `TripPaymentRequest`
- `DepositRecordResponse`, `DepositRecordRequest`
- `CustomerAdvancePaymentResponse`, `CustomerAdvancePaymentRequest`
- `DriverExpenseAdvanceResponse`, `DriverExpenseAdvanceRequest`
- `ExpenseVoucherResponse`, `ExpenseVoucherRequestPayload`
- `AccountingSummaryResponse`, `DriverDailySummaryResponse`

### `apiService.ts` — API Functions

Tất cả hàm gọi API tập trung ở đây (fetch wrapper với JWT header). Pattern chuẩn:

```typescript
// GET với pagination
const trips = await apiService.searchTrips({ status, date, page, size });

// POST
const payment = await apiService.createTripPayment(req);

// PATCH status
await apiService.updateCustomerAdvanceStatus(id, { status: 'RECONCILED', actionUserId });

// DELETE
await apiService.deleteTripPayment(id);
```

**Base URL detection**: Tự động phát hiện môi trường:
- `localhost:3000` → `http://localhost:8080/transport-service`
- Production → `/transport-service` (same origin, proxied qua Nginx)

---

## 6. Layout & Navigation

- **Layout**: Sidebar cố định bên trái (`AppSidebar`) + Content area (`SidebarInset`).
- **Key UX**: Mỗi khi chuyển route, Layout được remount hoàn toàn (key = `location.pathname`) để reset state của component.
- **Sidebar menu** hiển thị theo role người dùng từ `AuthContext`.

---

## 7. State Management

| Pattern | Dùng cho |
|---|---|
| `useState` / `useReducer` | UI state local (modal, form, filters) |
| `AuthContext` | Auth state (user, token) |
| `@tanstack/react-query` | Server state: fetch, cache, invalidate |
| `react-hook-form` + `zod` | Form state + schema validation |

---

## 8. Đề Xuất Cải Tiến Frontend

### 🔴 Mức Cao

| # | Tính năng | Mô tả |
|---|---|---|
| 1 | **Trang Sổ Quỹ Tài Xế** | Màn hình liệt kê lịch sử `driver_transactions` khi backend thêm API ledger. Hỗ trợ lọc theo ngày, loại giao dịch. |
| 2 | **Cập nhật `paymentMethod` trong form nộp tiền** | Thêm dropdown chọn "Tiền mặt / Chuyển khoản" vào form Ghi nhận nộp tiền (DepositRecord). Frontend chưa có field này dù backend đã hỗ trợ. |
| 3 | **Hiển thị `customerPrepaid` trong Daily Summary** | `DriverDashboard` cần hiển thị thêm cột "Khách đã TK trước" để giải thích tại sao số tiền phải nộp ít hơn giá vé. |

### 🟡 Mức Trung Bình

| # | Tính năng | Mô tả |
|---|---|---|
| 4 | **Export Excel** | Nút export tại trang Accounting và ExpenseVouchers khi backend hoàn thiện API export. |
| 5 | **Tìm kiếm nhanh khách hàng khi tạo booking** | Autocomplete tìm `Customer` theo tên/SĐT và tự điền thông tin, thay vì nhập tay. |
| 6 | **Notification Badge** | Hiển thị badge đếm số phiếu tạm ứng đang chờ duyệt (`REQUESTED`) trên menu sidebar. |
| 7 | **Dark Mode** | Đã cài `next-themes`, chỉ cần thêm toggle và kiểm tra từng component. |
| 8 | **Thêm Route `/drivers/:id/edit`** | Hiện tại AddDriver dùng cho cả tạo mới, thiếu màn hình chỉnh sửa tài xế riêng biệt. |

### 🟢 Mức Thấp

| # | Tính năng | Mô tả |
|---|---|---|
| 9 | **Dashboard Analytics với Recharts** | Đã có `recharts`, có thể thêm biểu đồ doanh thu theo tuần/tháng vào `Index.tsx`. |
| 10 | **Xác nhận trước khi xóa** | Một số nơi thiếu Confirm Dialog trước khi xóa dữ liệu quan trọng. |
| 11 | **Lazy loading các route lớn** | `CallCenter.tsx` (62KB), `ExpenseVouchers.tsx` (75KB) nên dùng `React.lazy()` để giảm bundle size ban đầu. |

---

## 9. Hướng Dẫn Chạy Dev

```bash
cd xeghepFE

# Cài dependencies
npm install

# Chạy dev server (cần backend đang chạy ở :8080)
npm run dev

# Build production
npm run build
```

> **Lưu ý**: Dev server chạy ở port `3000`, tự động proxy API sang `localhost:8080`.
