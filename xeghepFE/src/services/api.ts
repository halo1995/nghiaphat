// API Configuration

const detectDefaultBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    if (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) {
      return 'http://localhost:8080/transport-service';
    }
    return origin + '/transport-service';   ;
  }
  return 'http://localhost:8080/transport-service';
};

export const API_BASE_URL = detectDefaultBaseUrl();

export interface ApiResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    totalElements: number;
  };
  last: boolean;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface PaymentAttachmentResponse {
  id: number;
  fileName: string;
  contentType: string | null;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string | null;
  downloadUrl: string;
}

export interface DriverResponse {
  id: number;
  username: string;
  name: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: string;
  dateOfBirth: string;
  joinDate: string;
  status: 'HOAT_DONG' | 'NGHI_PHEP' | 'NGUNG_HOAT_DONG';
  avatar: string;
  vehicleId: number | null;
  totalTrips: number;
  rating: number;
  totalEarnings: number;
  outstandingBalance: number;
}

export interface VehicleResponse {
  id: number;
  name: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
  seats: number;
  fuelType: 'XANG' | 'DAU' | 'DIEN' | 'HYBRID';
  status: 'SAN_SANG' | 'DANG_CHAY' | 'BAO_TRI' | 'NGUNG_HOAT_DONG';
  mileage: number;
  lastMaintenance: string;
  nextMaintenance: string;
  image: string;
  totalTrips: number;
  rating: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserResponse;
  token: string;
}

export interface UserResponse {
  id: number;
  username: string;
  name: string;
  role: 'ADMIN' | 'DISPATCHER' | 'CALL_CENTER' | 'DRIVER' | 'ACCOUNTANT';
  email: string;
  phone: string;
  createdAt: string;
  lastLogin: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'DISPATCHER' | 'CALL_CENTER' | 'DRIVER' | 'ACCOUNTANT';
  email: string;
  phone: string;
}

export interface DriverRequest {
  username: string;
  password?: string;
  name: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry?: string;
  address: string;
  dateOfBirth?: string;
  joinDate?: string;
  status: 'HOAT_DONG' | 'NGHI_PHEP' | 'NGUNG_HOAT_DONG';
  avatar?: string;
  vehicleId?: number | null;
}

export interface ChangePasswordRequest {
  userId: number;
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  success: boolean;
}

export interface VehicleRequest {
  name: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
  seats: number;
  fuelType: 'XANG' | 'DAU' | 'DIEN' | 'HYBRID';
  status: 'SAN_SANG' | 'DANG_CHAY' | 'BAO_TRI' | 'NGUNG_HOAT_DONG';
  mileage: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  image: string;
}

export type TripStatus =
  | 'CHO_XAC_NHAN'
  | 'DA_XAC_NHAN'
  | 'DA_GHEP_CHUYEN'
  | 'DA_PHAN_XE'
  | 'DANG_DON'
  | 'DANG_DI'
  | 'HOAN_THANH'
  | 'DA_HUY';

export interface TripResponse {
  id: number;
  vehicleId: number | null;
  vehicleName: string | null;
  driverId: number | null;
  driverName: string | null;
  customerId: number;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  pickupProvinceCode: string | null;
  pickupWardCode: string | null;
  dropoffLocation: string;
  dropoffProvinceCode: string | null;
  dropoffWardCode: string | null;
  pickupTime: string;
  dropoffTime: string | null;
  distance: number | null;
  price: number;
  customerAdvanceReconciled: number | null;
  customerAdvancePending: number | null;
  customerOutstandingAmount: number | null;
  status: TripStatus;
  passengers: number;
  notes: string | null;
  rating: number | null;
  createdAt: string;
  confirmedAt: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  pickupConfirmed: boolean | null;
  dropoffConfirmed: boolean | null;
  groupId: string | null;
}

export interface TripRequest {
  vehicleId?: number | null;
  vehicleName?: string | null;
  driverId?: number | null;
  driverName?: string | null;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  pickupProvinceCode?: string | null;
  pickupWardCode?: string | null;
  dropoffLocation: string;
  dropoffProvinceCode?: string | null;
  dropoffWardCode?: string | null;
  pickupTime: string;
  dropoffTime?: string | null;
  distance?: number | null;
  price: number;
  passengers: number;
  notes?: string | null;
  status?: TripStatus;
  assignedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  pickupConfirmed?: boolean | null;
  dropoffConfirmed?: boolean | null;
  groupId?: string | null;
}

export type PaymentMethod = 'CASH' | 'TRANSFER';

export interface TripPaymentResponse {
  id: number;
  tripId: number;
  driverId: number;
  amount: number;
  method: PaymentMethod;
  collectedAt: string;
  attachments: PaymentAttachmentResponse[];
}

export interface TripPaymentRequest {
  tripId: number;
  driverId: number;
  amount: number;
  method: PaymentMethod;
}

export interface DepositRecordResponse {
  id: number;
  driverId: number;
  amount: number;
  createdAt: string;
  note?: string | null;
  attachments: PaymentAttachmentResponse[];
}

export interface DepositRecordRequest {
  driverId: number;
  amount: number;
  note?: string | null;
}

export type CustomerAdvanceStatus = 'PENDING' | 'SUBMITTED' | 'RECONCILED' | 'REJECTED';
export type CustomerAdvanceMethod = 'CASH' | 'TRANSFER';

export interface CustomerAdvancePaymentResponse {
  id: number;
  tripId: number | null;
  customerName: string;
  customerPhone: string;
  amount: number;
  method: CustomerAdvanceMethod;
  status: CustomerAdvanceStatus;
  collectedBy: number | null;
  collectedAt: string;
  submittedBy: number | null;
  submittedAt: string | null;
  reconciledBy: number | null;
  reconciledAt: string | null;
  receiptCode: string | null;
  note: string | null;
  attachments: PaymentAttachmentResponse[];
}

export interface CustomerAdvancePaymentRequest {
  tripId?: number | null;
  customerName: string;
  customerPhone: string;
  amount: number;
  method: CustomerAdvanceMethod;
  collectedBy?: number | null;
  receiptCode?: string | null;
  note?: string | null;
}

export interface CustomerAdvanceStatusUpdateRequest {
  status: CustomerAdvanceStatus;
  actionUserId?: number | null;
  note?: string | null;
}

export type DriverExpenseType = 'TOLL' | 'PARKING' | 'FUEL' | 'OTHER';
export type DriverExpenseStatus = 'REQUESTED' | 'APPROVED' | 'DEDUCTED' | 'REJECTED';

export interface DriverExpenseAdvanceResponse {
  id: number;
  driverId: number;
  tripId: number | null;
  amount: number;
  expenseType: DriverExpenseType;
  status: DriverExpenseStatus;
  requestedBy: number | null;
  requestedAt: string;
  approvedBy: number | null;
  approvedAt: string | null;
  deductedBy: number | null;
  deductedAt: string | null;
  rejectionReason: string | null;
  note: string | null;
  attachments: PaymentAttachmentResponse[];
}

export interface DriverExpenseAdvanceRequest {
  driverId: number;
  tripId?: number | null;
  amount: number;
  expenseType: DriverExpenseType;
  requestedBy?: number | null;
  note?: string | null;
}

export interface DriverExpenseAdvanceStatusUpdateRequest {
  status: DriverExpenseStatus;
  actionUserId?: number | null;
  note?: string | null;
  rejectionReason?: string | null;
}

export interface DriverAccountingSummaryResponse {
  driverId: number;
  driverName: string;
  totalCollected: number;
  totalDeposited: number;
  outstanding: number;
  completedTrips: number;
  advanceOutstanding: number;
}

export interface AccountingSummaryResponse {
  totalCollected: number;
  totalDeposited: number;
  totalOutstanding: number;
  totalCompletedTrips: number;
  totalCustomerPrepaidPending: number;
  totalCustomerPrepaidSubmitted: number;
  totalDriverAdvanceOutstanding: number;
  byDriver: DriverAccountingSummaryResponse[];
}

export type TripGroupStatus = 'DANG_GHEP' | 'DA_PHAN_XE' | 'DANG_CHAY' | 'HOAN_THANH';

export interface TripGroupResponse {
  id: number;
  name: string;
  tripIds: string | null;
  vehicleId: number | null;
  vehicleName: string | null;
  driverId: number | null;
  driverName: string | null;
  status: TripGroupStatus;
  createdAt: string;
  totalPassengers: number | null;
  totalRevenue: number | null;
}

export interface TripGroupRequest {
  name: string;
  tripIds?: string | null;
  vehicleId?: number | null;
  vehicleName?: string | null;
  driverId?: number | null;
  driverName?: string | null;
  status?: TripGroupStatus;
  totalPassengers?: number | null;
  totalRevenue?: number | null;
}

export type CustomerStatus = 'HOAT_DONG' | 'NGUNG_HOAT_DONG';

export interface CustomerResponse {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  joinDate: string | null;
  totalTrips: number | null;
  totalSpent: number | null;
  rating: number | null;
  avatar: string | null;
  status: CustomerStatus;
}

export interface CustomerRequest {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
  status?: CustomerStatus;
}
