import { apiService } from '@/services/apiService';
import type {
  AccountingSummaryResponse,
  DepositRecordResponse,
  TripPaymentResponse,
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
} from '@/services/api';

export type PaymentMethod = 'cash' | 'transfer';

export interface TripPayment {
  id: string;
  tripId: string;
  driverId: string;
  amount: number;
  method: PaymentMethod;
  collectedAt: string;
}

export interface DepositRecord {
  id: string;
  driverId: string;
  amount: number;
  createdAt: string;
  note?: string;
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
}

export type DriverExpenseStatus = 'requested' | 'approved' | 'deducted' | 'rejected';
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
}

const METHOD_TO_FRONT: Record<ApiPaymentMethod, PaymentMethod> = {
  CASH: 'cash',
  TRANSFER: 'transfer',
};

const METHOD_TO_BACK: Record<PaymentMethod, ApiPaymentMethod> = {
  cash: 'CASH',
  transfer: 'TRANSFER',
};

const mapTripPayment = (payment: TripPaymentResponse): TripPayment => ({
  id: payment.id.toString(),
  tripId: payment.tripId.toString(),
  driverId: payment.driverId.toString(),
  amount: payment.amount,
  method: METHOD_TO_FRONT[payment.method],
  collectedAt: payment.collectedAt,
});

const mapDepositRecord = (record: DepositRecordResponse): DepositRecord => ({
  id: record.id.toString(),
  driverId: record.driverId.toString(),
  amount: record.amount,
  createdAt: record.createdAt,
  note: record.note ?? undefined,
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
  DEDUCTED: 'deducted',
  REJECTED: 'rejected',
};

const DRIVER_STATUS_TO_BACK: Record<DriverExpenseStatus, ApiDriverExpenseStatus> = {
  requested: 'REQUESTED',
  approved: 'APPROVED',
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
}): Promise<TripPayment> => {
  const request = {
    tripId: Number(input.tripId),
    driverId: Number(input.driverId),
    amount: input.amount,
    method: METHOD_TO_BACK[input.method],
  };
  const response = await apiService.createTripPayment(request);
  return mapTripPayment(response);
};

export const createDeposit = async (input: {
  driverId: string;
  amount: number;
  note?: string;
}): Promise<DepositRecord> => {
  const request = {
    driverId: Number(input.driverId),
    amount: input.amount,
    note: input.note,
  };
  const response = await apiService.createDepositRecord(request);
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
  const response = await apiService.createCustomerAdvancePayment(request);
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
  page?: number;
  size?: number;
}): Promise<DriverExpenseAdvance[]> => {
  const response = await apiService.getDriverExpenseAdvances(
    options?.driverId ? Number(options.driverId) : undefined,
    options?.status ? DRIVER_STATUS_TO_BACK[options.status] : undefined,
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
}): Promise<DriverExpenseAdvance> => {
  const request: ApiDriverExpenseAdvanceRequest = {
    driverId: Number(input.driverId),
    tripId: input.tripId ? Number(input.tripId) : undefined,
    amount: input.amount,
    expenseType: DRIVER_TYPE_TO_BACK[input.expenseType],
    requestedBy: input.requestedBy ? Number(input.requestedBy) : undefined,
    note: input.note,
  };
  const response = await apiService.createDriverExpenseAdvance(request);
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
