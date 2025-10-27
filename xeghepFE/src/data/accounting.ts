import { apiService } from '@/services/apiService';
import type {
  AccountingSummaryResponse,
  DepositRecordResponse,
  TripPaymentResponse,
  PaymentMethod as ApiPaymentMethod,
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
  byDriver: Array<{
    driverId: string;
    driverName: string;
    revenue: number;
    completedTrips: number;
    outstanding: number;
    deposited: number;
  }>;
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

const toSummary = (summary: AccountingSummaryResponse): RevenueSummary => ({
  totalRevenue: summary.totalCollected,
  completedTrips: Number(summary.totalCompletedTrips || 0),
  totalDeposited: summary.totalDeposited,
  totalOutstanding: summary.totalOutstanding,
  byDriver: summary.byDriver.map((driver) => ({
    driverId: driver.driverId.toString(),
    driverName: driver.driverName,
    revenue: driver.totalCollected,
    deposited: driver.totalDeposited,
    completedTrips: Number(driver.completedTrips || 0),
    outstanding: driver.outstanding,
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
