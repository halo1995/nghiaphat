import { apiService } from '@/services/apiService';
import type {
  ExpenseVoucherResponse as ApiExpenseVoucher,
  ExpenseVoucherRequestPayload,
  ExpenseVoucherStatusUpdatePayload,
  ExpenseVoucherHistoryResponse,
  ExpenseSummaryResponse,
  ExpenseVoucherStatus,
  ExpenseVoucherCategory,
  PaymentAttachmentResponse,
} from '@/services/api';
import type { PaymentAttachment } from './accounting';

export type { ExpenseVoucherStatus, ExpenseVoucherCategory } from '@/services/api';

export interface ExpenseVoucher {
  id: string;
  code: string;
  title: string;
  category: ExpenseVoucherCategory;
  amount: number;
  payeeName: string;
  payeeAccount?: string | null;
  description?: string | null;
  note?: string | null;
  status: ExpenseVoucherStatus;
  walletId: string;
  walletName?: string | null;
  driverExpenseAdvanceId?: string | null;
  createdBy: string;
  createdByName?: string | null;
  createdAt?: string | null;
  submittedBy?: string | null;
  submittedByName?: string | null;
  submittedAt?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  paidBy?: string | null;
  paidByName?: string | null;
  paidAt?: string | null;
  rejectedBy?: string | null;
  rejectedByName?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  attachments: PaymentAttachment[];
}

export interface ExpenseVoucherHistory {
  id: string;
  fromStatus?: ExpenseVoucherStatus | null;
  toStatus: ExpenseVoucherStatus;
  note?: string | null;
  actionBy?: string | null;
  actionByName?: string | null;
  actionAt: string;
}

export interface ExpenseSummary {
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  walletBalance: number;
}

export interface ExpenseVoucherList {
  items: ExpenseVoucher[];
  page: number;
  size: number;
  total: number;
}

export interface ExpenseVoucherQuery {
  status?: ExpenseVoucherStatus;
  category?: ExpenseVoucherCategory;
  from?: string;
  to?: string;
  createdBy?: string;
  walletId?: string;
  page?: number;
  size?: number;
}

export interface CreateExpenseVoucherInput {
  title: string;
  category: ExpenseVoucherCategory;
  amount: number;
  payeeName: string;
  payeeAccount?: string | null;
  description?: string | null;
  note?: string | null;
  actorId: string;
  walletId?: string | null;
  driverExpenseAdvanceId?: string | null;
  submitImmediately?: boolean;
  attachments?: File[];
}

export interface UpdateExpenseVoucherInput extends CreateExpenseVoucherInput {
  id: string;
}

export interface UpdateExpenseVoucherStatusInput {
  id: string;
  status: ExpenseVoucherStatus;
  actionUserId: string;
  note?: string | null;
  rejectionReason?: string | null;
  attachments?: File[];
}

const mapAttachment = (attachment: PaymentAttachmentResponse): PaymentAttachment => ({
  id: attachment.id.toString(),
  fileName: attachment.fileName,
  contentType: attachment.contentType ?? undefined,
  sizeBytes: attachment.sizeBytes,
  createdAt: attachment.createdAt,
  expiresAt: attachment.expiresAt ?? undefined,
  downloadUrl: attachment.downloadUrl,
});

const mapVoucher = (voucher: ApiExpenseVoucher): ExpenseVoucher => ({
  id: voucher.id.toString(),
  code: voucher.code,
  title: voucher.title,
  category: voucher.category,
  amount: voucher.amount,
  payeeName: voucher.payeeName,
  payeeAccount: voucher.payeeAccount,
  description: voucher.description,
  note: voucher.note,
  status: voucher.status,
  walletId: voucher.walletId.toString(),
  walletName: voucher.walletName ?? undefined,
  driverExpenseAdvanceId: voucher.driverExpenseAdvanceId ? voucher.driverExpenseAdvanceId.toString() : undefined,
  createdBy: voucher.createdBy.toString(),
  createdByName: voucher.createdByName ?? undefined,
  createdAt: voucher.createdAt,
  submittedBy: voucher.submittedBy ? voucher.submittedBy.toString() : undefined,
  submittedByName: voucher.submittedByName ?? undefined,
  submittedAt: voucher.submittedAt ?? undefined,
  approvedBy: voucher.approvedBy ? voucher.approvedBy.toString() : undefined,
  approvedByName: voucher.approvedByName ?? undefined,
  approvedAt: voucher.approvedAt ?? undefined,
  paidBy: voucher.paidBy ? voucher.paidBy.toString() : undefined,
  paidByName: voucher.paidByName ?? undefined,
  paidAt: voucher.paidAt ?? undefined,
  rejectedBy: voucher.rejectedBy ? voucher.rejectedBy.toString() : undefined,
  rejectedByName: voucher.rejectedByName ?? undefined,
  rejectedAt: voucher.rejectedAt ?? undefined,
  rejectionReason: voucher.rejectionReason ?? undefined,
  attachments: (voucher.attachments ?? []).map(mapAttachment),
});

const mapHistory = (entry: ExpenseVoucherHistoryResponse): ExpenseVoucherHistory => ({
  id: entry.id.toString(),
  fromStatus: entry.fromStatus ?? null,
  toStatus: entry.toStatus,
  note: entry.note,
  actionBy: entry.actionBy ? entry.actionBy.toString() : undefined,
  actionByName: entry.actionByName ?? undefined,
  actionAt: entry.actionAt,
});

const mapSummary = (summary: ExpenseSummaryResponse): ExpenseSummary => ({
  totalApproved: summary.totalApproved,
  totalPending: summary.totalPending,
  totalRejected: summary.totalRejected,
  approvedCount: summary.approvedCount,
  pendingCount: summary.pendingCount,
  rejectedCount: summary.rejectedCount,
  walletBalance: summary.walletBalance,
});

const buildPayload = (input: CreateExpenseVoucherInput | UpdateExpenseVoucherInput): ExpenseVoucherRequestPayload => ({
  title: input.title,
  category: input.category,
  amount: input.amount,
  payeeName: input.payeeName,
  payeeAccount: input.payeeAccount ?? null,
  description: input.description ?? null,
  note: input.note ?? null,
  actorId: Number(input.actorId),
  walletId: input.walletId ? Number(input.walletId) : null,
  driverExpenseAdvanceId: input.driverExpenseAdvanceId ? Number(input.driverExpenseAdvanceId) : null,
  submitImmediately: Boolean(input.submitImmediately),
});

export const getExpenseVouchers = async (query: ExpenseVoucherQuery = {}): Promise<ExpenseVoucherList> => {
  const response = await apiService.getExpenseVouchers({
    status: query.status,
    category: query.category,
    from: query.from,
    to: query.to,
    createdBy: query.createdBy ? Number(query.createdBy) : undefined,
    walletId: query.walletId ? Number(query.walletId) : undefined,
    page: query.page,
    size: query.size,
  });
  return {
    items: response.content.map(mapVoucher),
    page: response.pageable.pageNumber,
    size: response.pageable.pageSize,
    total: response.pageable.totalElements,
  };
};

export const getExpenseVoucher = async (id: string): Promise<ExpenseVoucher> => {
  const voucher = await apiService.getExpenseVoucher(Number(id));
  return mapVoucher(voucher);
};

export const createExpenseVoucher = async (input: CreateExpenseVoucherInput): Promise<ExpenseVoucher> => {
  const payload = buildPayload(input);
  const response = await apiService.createExpenseVoucher(payload, input.attachments ?? []);
  return mapVoucher(response);
};

export const updateExpenseVoucher = async (input: UpdateExpenseVoucherInput): Promise<ExpenseVoucher> => {
  const payload = buildPayload(input);
  const response = await apiService.updateExpenseVoucher(Number(input.id), payload, input.attachments ?? []);
  return mapVoucher(response);
};

export const updateExpenseVoucherStatus = async (input: UpdateExpenseVoucherStatusInput): Promise<ExpenseVoucher> => {
  const payload: ExpenseVoucherStatusUpdatePayload = {
    status: input.status,
    actionUserId: Number(input.actionUserId),
    note: input.note ?? null,
    rejectionReason: input.rejectionReason ?? null,
  };
  const response = await apiService.updateExpenseVoucherStatus(Number(input.id), payload, input.attachments ?? []);
  return mapVoucher(response);
};

export const getExpenseVoucherHistory = async (id: string): Promise<ExpenseVoucherHistory[]> => {
  const history = await apiService.getExpenseVoucherHistory(Number(id));
  return history.map(mapHistory);
};

export const getExpenseSummary = async (from?: string, to?: string): Promise<ExpenseSummary> => {
  const summary = await apiService.getExpenseSummary(from, to);
  return mapSummary(summary);
};
