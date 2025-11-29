import { apiService } from '@/services/apiService';
import { API_BASE_URL } from '@/services/api';
import type {
  AccountingSummaryResponse,
  DepositRecordResponse,
  TripPaymentResponse,
  PaymentAttachmentResponse,
  PaymentMethod as ApiPaymentMethod,
  CustomerAdvancePaymentResponse,
  CustomerAdvancePaymentRequest as ApiCustomerAdvancePaymentRequest,
  CustomerAdvanceStatusUpdateRequest as ApiCustomerAdvanceStatusUpdateRequest,
  CustomerAdvanceStatus as ApiCustomerAdvanceStatus,
  CustomerAdvanceMethod as ApiCustomerAdvanceMethod,
  DriverExpenseAdvanceResponse,
  DriverExpenseAdvanceRequest as ApiDriverExpenseAdvanceRequest,
  DriverExpenseAdvanceStatusUpdateRequest as ApiDriverExpenseAdvanceStatusUpdateRequest,
  DriverExpenseStatus as ApiDriverExpenseStatus,
  DriverExpenseType as ApiDriverExpenseType,
  DriverDailySummaryResponse,
  DriverDailyTripSummaryResponse,
} from '@/services/api';

export const secureAttachmentUrl = (url: string): string => {
  if (!url) {
    return url;
  }
  const prefersHttps =
    (typeof window !== 'undefined' && window.location.protocol === 'https:')
    || API_BASE_URL.startsWith('https://');
  if (!prefersHttps) {
    return url;
  }
  if (
    url.startsWith('https://')
    || url.startsWith('data:')
    || url.startsWith('blob:')
  ) {
    return url;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : API_BASE_URL;
    const resolved = new URL(url, base);
    if (resolved.protocol === 'http:') {
      resolved.protocol = 'https:';
    }
    return resolved.toString();
  } catch (_error) {
    if (url.startsWith('http://')) {
      return `https://${url.slice('http://'.length)}`;
    }
    return url;
  }
};

export type PaymentMethod = 'cash' | 'transfer';

export interface PaymentAttachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt?: string;
  downloadUrl: string;
}

export interface TripPayment {
  id: string;
  tripId: string;
  driverId: string;
  amount: number;
  method: PaymentMethod;
  collectedAt: string;
  attachments: PaymentAttachment[];
}

export interface DepositRecord {
  id: string;
  driverId: string;
  amount: number;
  createdAt: string;
  note?: string;
  attachments: PaymentAttachment[];
}

export interface RevenueSummary {
  totalRevenue: number;
  completedTrips: number;
  totalDeposited: number;
  totalOutstanding: number;
  totalCustomerPrepaidPending: number;
  totalCustomerPrepaidSubmitted: number;
  totalDriverAdvanceOutstanding: number;
  byDriver: Array<{
    driverId: string;
    driverName: string;
    revenue: number;
    completedTrips: number;
    outstanding: number;
    deposited: number;
    advanceOutstanding: number;
  }>;
}

export type CustomerAdvanceStatus = 'pending' | 'submitted' | 'reconciled' | 'rejected';
export type CustomerAdvanceMethod = 'cash' | 'transfer';

export interface CustomerAdvancePayment {
  id: string;
  tripId?: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  method: CustomerAdvanceMethod;
  status: CustomerAdvanceStatus;
  collectedBy?: string;
  collectedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  reconciledBy?: string;
  reconciledAt?: string;
  receiptCode?: string;
  note?: string;
  attachments: PaymentAttachment[];
}

export type DriverExpenseStatus = 'requested' | 'approved' | 'transferred' | 'deducted' | 'rejected';
export type DriverExpenseType = 'toll' | 'parking' | 'fuel' | 'other';

export interface DriverExpenseAdvance {
  id: string;
  driverId: string;
  tripId?: string;
  amount: number;
  expenseType: DriverExpenseType;
  status: DriverExpenseStatus;
  requestedBy?: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  deductedBy?: string;
  deductedAt?: string;
  rejectionReason?: string;
  note?: string;
  attachments: PaymentAttachment[];
}

export interface DriverDailyTripSummary {
  tripId: string;
  pickupLocation: string;
  dropoffLocation: string;
  amount: number;
  status: string;
  alreadyPaid: number;
}

export interface DriverDailySummary {
  driverId: string;
  driverName: string;
  date: string;
  expectedAmount: number;
  trips: DriverDailyTripSummary[];
}

const METHOD_TO_FRONT: Record<ApiPaymentMethod, PaymentMethod> = {
  CASH: 'cash',
  TRANSFER: 'transfer',
};

const METHOD_TO_BACK: Record<PaymentMethod, ApiPaymentMethod> = {
  cash: 'CASH',
  transfer: 'TRANSFER',
};

const mapAttachment = (attachment: PaymentAttachmentResponse): PaymentAttachment => ({
  id: attachment.id.toString(),
  fileName: attachment.fileName,
  contentType: attachment.contentType ?? undefined,
  sizeBytes: attachment.sizeBytes,
  createdAt: attachment.createdAt,
  expiresAt: attachment.expiresAt ?? undefined,
  downloadUrl: secureAttachmentUrl(attachment.downloadUrl),
});

const mapTripPayment = (payment: TripPaymentResponse): TripPayment => ({
  id: payment.id.toString(),
  tripId: payment.tripId.toString(),
  driverId: payment.driverId.toString(),
  amount: payment.amount,
  method: METHOD_TO_FRONT[payment.method],
  collectedAt: payment.collectedAt,
  attachments: (payment.attachments ?? []).map(mapAttachment),
});

const mapDepositRecord = (record: DepositRecordResponse): DepositRecord => ({
  id: record.id.toString(),
  driverId: record.driverId.toString(),
  amount: record.amount,
  createdAt: record.createdAt,
  note: record.note ?? undefined,
  attachments: (record.attachments ?? []).map(mapAttachment),
});

const CUSTOMER_METHOD_TO_FRONT: Record<ApiCustomerAdvanceMethod, CustomerAdvanceMethod> = {
  CASH: 'cash',
  TRANSFER: 'transfer',
};

const CUSTOMER_METHOD_TO_BACK: Record<CustomerAdvanceMethod, ApiCustomerAdvanceMethod> = {
  cash: 'CASH',
  transfer: 'TRANSFER',
};

const CUSTOMER_STATUS_TO_FRONT: Record<ApiCustomerAdvanceStatus, CustomerAdvanceStatus> = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  RECONCILED: 'reconciled',
  REJECTED: 'rejected',
};

const CUSTOMER_STATUS_TO_BACK: Record<CustomerAdvanceStatus, ApiCustomerAdvanceStatus> = {
  pending: 'PENDING',
  submitted: 'SUBMITTED',
  reconciled: 'RECONCILED',
  rejected: 'REJECTED',
};

const DRIVER_STATUS_TO_FRONT: Record<ApiDriverExpenseStatus, DriverExpenseStatus> = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  TRANSFERRED: 'transferred',
  DEDUCTED: 'deducted',
  REJECTED: 'rejected',
};

const DRIVER_STATUS_TO_BACK: Record<DriverExpenseStatus, ApiDriverExpenseStatus> = {
  requested: 'REQUESTED',
  approved: 'APPROVED',
  transferred: 'TRANSFERRED',
  deducted: 'DEDUCTED',
  rejected: 'REJECTED',
};

const DRIVER_TYPE_TO_FRONT: Record<ApiDriverExpenseType, DriverExpenseType> = {
  TOLL: 'toll',
  PARKING: 'parking',
  FUEL: 'fuel',
  OTHER: 'other',
};

const DRIVER_TYPE_TO_BACK: Record<DriverExpenseType, ApiDriverExpenseType> = {
  toll: 'TOLL',
  parking: 'PARKING',
  fuel: 'FUEL',
  other: 'OTHER',
};

const mapCustomerAdvance = (advance: CustomerAdvancePaymentResponse): CustomerAdvancePayment => ({
  id: advance.id.toString(),
  tripId: advance.tripId != null ? advance.tripId.toString() : undefined,
  customerName: advance.customerName,
  customerPhone: advance.customerPhone,
  amount: advance.amount,
  method: CUSTOMER_METHOD_TO_FRONT[advance.method],
  status: CUSTOMER_STATUS_TO_FRONT[advance.status],
  collectedBy: advance.collectedBy != null ? advance.collectedBy.toString() : undefined,
  collectedAt: advance.collectedAt,
  submittedBy: advance.submittedBy != null ? advance.submittedBy.toString() : undefined,
  submittedAt: advance.submittedAt ?? undefined,
  reconciledBy: advance.reconciledBy != null ? advance.reconciledBy.toString() : undefined,
  reconciledAt: advance.reconciledAt ?? undefined,
  receiptCode: advance.receiptCode ?? undefined,
  note: advance.note ?? undefined,
  attachments: (advance.attachments ?? []).map(mapAttachment),
});

const mapDriverAdvance = (advance: DriverExpenseAdvanceResponse): DriverExpenseAdvance => ({
  id: advance.id.toString(),
  driverId: advance.driverId.toString(),
  tripId: advance.tripId != null ? advance.tripId.toString() : undefined,
  amount: advance.amount,
  expenseType: DRIVER_TYPE_TO_FRONT[advance.expenseType],
  status: DRIVER_STATUS_TO_FRONT[advance.status],
  requestedBy: advance.requestedBy != null ? advance.requestedBy.toString() : undefined,
  requestedAt: advance.requestedAt,
  approvedBy: advance.approvedBy != null ? advance.approvedBy.toString() : undefined,
  approvedAt: advance.approvedAt ?? undefined,
  deductedBy: advance.deductedBy != null ? advance.deductedBy.toString() : undefined,
  deductedAt: advance.deductedAt ?? undefined,
  rejectionReason: advance.rejectionReason ?? undefined,
  note: advance.note ?? undefined,
  attachments: (advance.attachments ?? []).map(mapAttachment),
});

const toSummary = (summary: AccountingSummaryResponse): RevenueSummary => ({
  totalRevenue: summary.totalCollected,
  completedTrips: Number(summary.totalCompletedTrips || 0),
  totalDeposited: summary.totalDeposited,
  totalOutstanding: summary.totalOutstanding,
  totalCustomerPrepaidPending: summary.totalCustomerPrepaidPending,
  totalCustomerPrepaidSubmitted: summary.totalCustomerPrepaidSubmitted,
  totalDriverAdvanceOutstanding: summary.totalDriverAdvanceOutstanding,
  byDriver: summary.byDriver.map((driver) => ({
    driverId: driver.driverId.toString(),
    driverName: driver.driverName,
    revenue: driver.totalCollected,
    deposited: driver.totalDeposited,
    completedTrips: Number(driver.completedTrips || 0),
    outstanding: driver.outstanding,
    advanceOutstanding: driver.advanceOutstanding,
  })),
});

const toQueryDate = (value?: Date): string | undefined => {
  if (!value) return undefined;
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getPayments = async (): Promise<TripPayment[]> => {
  const response = await apiService.getTripPayments(undefined, 0, 500);
  return response.content.map(mapTripPayment);
};

export const getDeposits = async (): Promise<DepositRecord[]> => {
  const response = await apiService.getDepositRecords(undefined, 0, 500);
  return response.content.map(mapDepositRecord);
};

export const recordTripPayment = async (input: {
  tripId: string;
  driverId: string;
  amount: number;
  method: PaymentMethod;
  attachments?: File[];
  paymentDate?: string; // Optional: yyyy-MM-dd format
}): Promise<TripPayment> => {
  const request: any = {
    tripId: input.tripId && input.tripId.trim() ? Number(input.tripId) : null,
    driverId: Number(input.driverId),
    amount: input.amount,
    method: METHOD_TO_BACK[input.method],
    paymentDate: input.paymentDate,
  };
  const response = await apiService.createTripPayment(request, input.attachments ?? []);
  return mapTripPayment(response);
};

export const createDeposit = async (input: {
  driverId: string;
  amount: number;
  note?: string;
  attachments?: File[];
  paymentDate?: string;
}): Promise<DepositRecord> => {
  const request = {
    driverId: Number(input.driverId),
    amount: input.amount,
    note: input.note,
    paymentDate: input.paymentDate,
  };
  const response = await apiService.createDepositRecord(request, input.attachments ?? []);
  return mapDepositRecord(response);
};

export const getRevenueSummary = async (from?: Date, to?: Date): Promise<RevenueSummary> => {
  const summary = await apiService.getAccountingSummary(toQueryDate(from), toQueryDate(to));
  return toSummary(summary);
};

export const getDriverOutstanding = async (driverId: string): Promise<number> => {
  const summary = await apiService.getAccountingSummary();
  const driver = summary.byDriver.find((d) => d.driverId === Number(driverId));
  return driver ? driver.outstanding : 0;
};

export const getCustomerAdvances = async (options?: {
  status?: CustomerAdvanceStatus;
  tripId?: string;
  page?: number;
  size?: number;
}): Promise<CustomerAdvancePayment[]> => {
  const response = await apiService.getCustomerAdvancePayments(
    options?.status ? CUSTOMER_STATUS_TO_BACK[options.status] : undefined,
    options?.tripId ? Number(options.tripId) : undefined,
    options?.page ?? 0,
    options?.size ?? 100,
  );
  return response.content.map(mapCustomerAdvance);
};

export const createCustomerAdvance = async (input: {
  tripId?: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  method: CustomerAdvanceMethod;
  collectedBy?: string;
  receiptCode?: string;
  note?: string;
  attachments?: File[];
}): Promise<CustomerAdvancePayment> => {
  const request: ApiCustomerAdvancePaymentRequest = {
    tripId: input.tripId ? Number(input.tripId) : undefined,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    amount: input.amount,
    method: CUSTOMER_METHOD_TO_BACK[input.method],
    collectedBy: input.collectedBy ? Number(input.collectedBy) : undefined,
    receiptCode: input.receiptCode,
    note: input.note,
  };
  const response = await apiService.createCustomerAdvancePayment(request, input.attachments ?? []);
  return mapCustomerAdvance(response);
};

export const updateCustomerAdvanceStatus = async (input: {
  id: string;
  status: CustomerAdvanceStatus;
  actionUserId?: string;
  note?: string;
}): Promise<CustomerAdvancePayment> => {
  const request: ApiCustomerAdvanceStatusUpdateRequest = {
    status: CUSTOMER_STATUS_TO_BACK[input.status],
    actionUserId: input.actionUserId ? Number(input.actionUserId) : undefined,
    note: input.note,
  };
  const response = await apiService.updateCustomerAdvanceStatus(Number(input.id), request);
  return mapCustomerAdvance(response);
};

export const getDriverExpenseAdvances = async (options?: {
  driverId?: string;
  status?: DriverExpenseStatus;
  from?: Date;
  to?: Date;
  page?: number;
  size?: number;
}): Promise<DriverExpenseAdvance[]> => {
  const fromDate = toQueryDate(options?.from);
  const toDate = toQueryDate(options?.to);
  const response = await apiService.getDriverExpenseAdvances(
    options?.driverId ? Number(options.driverId) : undefined,
    options?.status ? DRIVER_STATUS_TO_BACK[options.status] : undefined,
    fromDate,
    toDate,
    options?.page ?? 0,
    options?.size ?? 100,
  );
  return response.content.map(mapDriverAdvance);
};

export const createDriverExpenseAdvance = async (input: {
  driverId: string;
  tripId?: string;
  amount: number;
  expenseType: DriverExpenseType;
  requestedBy?: string;
  note?: string;
  attachments?: File[];
}): Promise<DriverExpenseAdvance> => {
  const request: ApiDriverExpenseAdvanceRequest = {
    driverId: Number(input.driverId),
    tripId: input.tripId ? Number(input.tripId) : undefined,
    amount: input.amount,
    expenseType: DRIVER_TYPE_TO_BACK[input.expenseType],
    requestedBy: input.requestedBy ? Number(input.requestedBy) : undefined,
    note: input.note,
  };
  const response = await apiService.createDriverExpenseAdvance(request, input.attachments ?? []);
  return mapDriverAdvance(response);
};

export const updateDriverExpenseAdvanceStatus = async (input: {
  id: string;
  status: DriverExpenseStatus;
  actionUserId?: string;
  note?: string;
  rejectionReason?: string;
}): Promise<DriverExpenseAdvance> => {
  const request: ApiDriverExpenseAdvanceStatusUpdateRequest = {
    status: DRIVER_STATUS_TO_BACK[input.status],
    actionUserId: input.actionUserId ? Number(input.actionUserId) : undefined,
    note: input.note,
    rejectionReason: input.rejectionReason,
  };
  const response = await apiService.updateDriverExpenseAdvanceStatus(Number(input.id), request);
  return mapDriverAdvance(response);
};

const mapDailyTripSummary = (trip: DriverDailyTripSummaryResponse): DriverDailyTripSummary => ({
  tripId: trip.tripId.toString(),
  pickupLocation: trip.pickupLocation,
  dropoffLocation: trip.dropoffLocation,
  amount: trip.amount,
  status: trip.status,
  alreadyPaid: trip.alreadyPaid,
});

const mapDailySummary = (summary: DriverDailySummaryResponse): DriverDailySummary => ({
  driverId: summary.driverId.toString(),
  driverName: summary.driverName,
  date: summary.date,
  expectedAmount: summary.expectedAmount,
  trips: summary.trips.map(mapDailyTripSummary),
});

export const getDriverDailySummary = async (
  driverId: string,
  date: string
): Promise<DriverDailySummary> => {
  try {
    // Try to call the new API endpoint
    const response = await apiService.getDriverDailySummary(Number(driverId), date);
    return mapDailySummary(response);
  } catch (error) {
    // Fallback: Calculate from existing trips data
    // This will be used if backend doesn't have the endpoint yet
    console.warn('Driver daily summary API not available, using fallback calculation');

    // Get all trips (we'll filter on client side)
    const tripsResponse = await apiService.getTrips(undefined, undefined, 0, 500);
    const allTrips = tripsResponse.content;

    // Filter trips for this driver and date
    const targetDate = new Date(date).toISOString().split('T')[0];
    const driverTrips = allTrips.filter((trip) => {
      const tripDate = new Date(trip.pickupTime).toISOString().split('T')[0];
      const isCompleted = trip.status === 'HOAN_THANH';
      const isDriverMatch = trip.driverId?.toString() === driverId;
      const isDateMatch = tripDate === targetDate;
      return isCompleted && isDriverMatch && isDateMatch;
    });

    // Calculate expected amount and map trips
    const trips: DriverDailyTripSummary[] = driverTrips.map((trip) => {
      // Số tiền tài xế cần nộp = giá chuyến - số tiền ứng trước đã đối soát
      // Nếu backend trả về customerOutstandingAmount thì dùng, nếu không thì tính
      const outstandingAmount = trip.customerOutstandingAmount ??
        (trip.price - (trip.customerAdvanceReconciled ?? 0));

      return {
        tripId: trip.id.toString(),
        pickupLocation: trip.pickupLocation,
        dropoffLocation: trip.dropoffLocation,
        amount: outstandingAmount, // Số tiền thực tế cần nộp, không phải tổng giá chuyến
        status: trip.status,
        alreadyPaid: 0, // Would need payment data to calculate this accurately
      };
    });

    const expectedAmount = trips.reduce((sum, trip) => sum + trip.amount, 0);
    const driverName = driverTrips[0]?.driverName || 'Unknown Driver';

    return {
      driverId,
      driverName,
      date,
      expectedAmount,
      trips,
    };
  }
};

