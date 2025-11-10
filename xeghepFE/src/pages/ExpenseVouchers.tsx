import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { compressImages, MAX_VOUCHER_IMAGES } from '@/utils/imageCompression';
import {
  ExpenseVoucher,
  ExpenseVoucherList,
  ExpenseVoucherQuery,
  ExpenseVoucherStatus,
  ExpenseVoucherCategory,
  ExpenseVoucherHistory,
  ExpenseSummary,
  createExpenseVoucher,
  getExpenseSummary,
  getExpenseVoucherHistory,
  getExpenseVouchers,
  updateExpenseVoucher,
  updateExpenseVoucherStatus,
  CreateExpenseVoucherInput,
  UpdateExpenseVoucherInput,
  UpdateExpenseVoucherStatusInput,
} from '@/data/expenseVouchers';

const statusLabels: Record<ExpenseVoucherStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const statusVariants: Record<ExpenseVoucherStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline',
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

const categoryLabels: Record<ExpenseVoucherCategory, string> = {
  OFFICE_RENT: 'Thuê văn phòng',
  ELECTRICITY: 'Điện',
  WATER: 'Nước',
  SALARY: 'Lương nhân viên',
  DRIVER_ADVANCE: 'Tạm ứng tài xế',
  OPERATIONS: 'Chi phí vận hành',
  OTHER: 'Khác',
};

interface VoucherFormState {
  id?: string;
  title: string;
  category: ExpenseVoucherCategory;
  amount: string;
  payeeName: string;
  payeeAccount: string;
  description: string;
  note: string;
  walletId: string;
  driverExpenseAdvanceId: string;
  submitImmediately: boolean;
}

const defaultFormState: VoucherFormState = {
  title: '',
  category: 'OPERATIONS',
  amount: '',
  payeeName: '',
  payeeAccount: '',
  description: '',
  note: '',
  walletId: '',
  driverExpenseAdvanceId: '',
  submitImmediately: true,
};

const ExpenseVouchersPage: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [filters, setFilters] = useState<ExpenseVoucherQuery>({ status: 'PENDING', size: 20, page: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<VoucherFormState>(defaultFormState);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [historyVoucherId, setHistoryVoucherId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [currentVoucher, setCurrentVoucher] = useState<ExpenseVoucher | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';

  const vouchersQuery = useQuery<ExpenseVoucherList, Error>({
    queryKey: ['expense-vouchers', filters],
    queryFn: () => getExpenseVouchers(filters),
    placeholderData: (previousData) => previousData,
  });

  const summaryQuery = useQuery<ExpenseSummary, Error>({
    queryKey: ['expense-voucher-summary'],
    queryFn: () => getExpenseSummary(),
  });

  const historyQuery = useQuery<ExpenseVoucherHistory[], Error>({
    queryKey: ['expense-voucher-history', historyVoucherId],
    queryFn: () => (historyVoucherId ? getExpenseVoucherHistory(historyVoucherId) : Promise.resolve([])),
    enabled: historyVoucherId != null,
  });

  const resetForm = useCallback(() => {
    setFormState(defaultFormState);
    setSelectedFiles([]);
  }, []);

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
    setActiveTab('details');
    setHistoryVoucherId(null);
    setCurrentVoucher(null);
  };

  const openHistoryDialog = (voucher: ExpenseVoucher) => {
    setHistoryVoucherId(voucher.id);
    setCurrentVoucher(voucher);
    setFormState({
      id: voucher.id,
      title: voucher.title,
      category: voucher.category,
      amount: voucher.amount.toString(),
      payeeName: voucher.payeeName,
      payeeAccount: voucher.payeeAccount || '',
      description: voucher.description || '',
      note: voucher.note || '',
      walletId: voucher.walletId || '',
      driverExpenseAdvanceId: voucher.driverExpenseAdvanceId || '',
      submitImmediately: voucher.status !== 'DRAFT',
    });
    setSelectedFiles([]);
    setIsFormOpen(true);
    setActiveTab('history');
  };

  const formatCurrency = (amount: number) => amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('vi-VN', { hour12: false });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (!files.length) return;
    if (files.length + selectedFiles.length > MAX_VOUCHER_IMAGES) {
      toast({
        title: 'Quá số lượng ảnh',
        description: `Chỉ được tải tối đa ${MAX_VOUCHER_IMAGES} ảnh`,
        variant: 'destructive',
      });
      return;
    }
    setIsUploading(true);
    try {
      const compressed = await compressImages(files);
      setSelectedFiles((prev) => [...prev, ...compressed]);
    } catch (error) {
      toast({
        title: 'Không thể xử lý ảnh',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openAttachment = useCallback(async (attachment: { downloadUrl: string; fileName?: string }) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(attachment.downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error('Không thể tải file');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const opened = window.open(objectUrl, '_blank');
      if (!opened) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = attachment.fileName || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      toast({
        title: 'Lỗi tải file',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const createMutation = useMutation<ExpenseVoucher, Error, CreateExpenseVoucherInput>({
    mutationFn: createExpenseVoucher,
    onSuccess: () => {
      toast({ title: 'Đã tạo phiếu chi', description: 'Phiếu chi mới đã được lưu' });
      qc.invalidateQueries({ queryKey: ['expense-vouchers'] });
      qc.invalidateQueries({ queryKey: ['expense-voucher-summary'] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Không thể tạo phiếu chi',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation<ExpenseVoucher, Error, UpdateExpenseVoucherInput>({
    mutationFn: updateExpenseVoucher,
    onSuccess: () => {
      toast({ title: 'Đã cập nhật phiếu chi', description: 'Thông tin đã được lưu' });
      qc.invalidateQueries({ queryKey: ['expense-vouchers'] });
      qc.invalidateQueries({ queryKey: ['expense-voucher-summary'] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Không thể cập nhật phiếu chi',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation<ExpenseVoucher, Error, UpdateExpenseVoucherStatusInput>({
    mutationFn: updateExpenseVoucherStatus,
    onSuccess: () => {
      toast({ title: 'Đã cập nhật trạng thái', description: 'Phiếu chi đã được xử lý' });
      qc.invalidateQueries({ queryKey: ['expense-vouchers'] });
      qc.invalidateQueries({ queryKey: ['expense-voucher-summary'] });
    },
    onError: (error) => {
      toast({
        title: 'Không thể cập nhật trạng thái',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    },
  });

  const handleSubmitForm = () => {
    if (!canEditForm) {
      toast({ title: 'Không thể cập nhật', description: 'Phiếu chi đã hoàn tất', variant: 'destructive' });
      return;
    }
    if (!user?.id) {
      toast({ title: 'Thiếu quyền', description: 'Vui lòng đăng nhập lại', variant: 'destructive' });
      return;
    }

    const amount = Number(formState.amount);
    if (!formState.title || !formState.payeeName || Number.isNaN(amount) || amount <= 0) {
      toast({ title: 'Thiếu thông tin', description: 'Kiểm tra lại tiêu đề, người nhận và số tiền', variant: 'destructive' });
      return;
    }

    const payload = {
      title: formState.title.trim(),
      category: formState.category,
      amount,
      payeeName: formState.payeeName.trim(),
      payeeAccount: formState.payeeAccount || null,
      description: formState.description || null,
      note: formState.note || null,
      actorId: user.id.toString(),
      walletId: formState.walletId || null,
      driverExpenseAdvanceId: formState.driverExpenseAdvanceId || null,
      submitImmediately: formState.submitImmediately,
      attachments: selectedFiles,
    };

    if (formState.id) {
      updateMutation.mutate({ ...payload, id: formState.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleStatusChange = (voucher: ExpenseVoucher, status: ExpenseVoucherStatus) => {
    if (!user?.id) {
      toast({ title: 'Thiếu quyền', description: 'Vui lòng đăng nhập lại', variant: 'destructive' });
      return;
    }

    const rejectionReason = status === 'REJECTED'
      ? window.prompt('Nhập lý do từ chối phiếu chi')?.trim()
      : undefined;

    if (status === 'REJECTED' && !rejectionReason) {
      toast({ title: 'Đã hủy thao tác', description: 'Cần nhập lý do từ chối phiếu', variant: 'destructive' });
      return;
    }

    statusMutation.mutate({
      id: voucher.id,
      status,
      actionUserId: user.id.toString(),
      rejectionReason: rejectionReason || null,
    });
  };

  const applyFilters = (partial: Partial<ExpenseVoucherQuery>) => {
    setFilters((prev) => ({
      ...prev,
      ...partial,
      page: partial.page ?? 0,
    }));
  };

  const vouchers = vouchersQuery.data?.items ?? [];

  const statusFilterValue = filters.status ?? 'ALL';
  const categoryFilterValue = filters.category ?? 'ALL';

  const isSubmitting = createMutation.isPending || updateMutation.isPending || statusMutation.isPending;
  const canEditForm = !currentVoucher || currentVoucher.status === 'DRAFT' || currentVoucher.status === 'PENDING';

  const renderHistory = () => {
    if (!historyVoucherId) {
      return <div className="py-4 text-sm text-muted-foreground">Chọn phiếu chi để xem lịch sử</div>;
    }
    if (historyQuery.isLoading) {
      return <div className="py-4 text-sm text-muted-foreground">Đang tải lịch sử...</div>;
    }
    if (!historyQuery.data?.length) {
      return <div className="py-4 text-sm text-muted-foreground">Chưa có lịch sử</div>;
    }
    return (
      <div className="space-y-3">
        {historyQuery.data.map((entry) => (
          <div key={entry.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {entry.fromStatus && <Badge variant="outline">{statusLabels[entry.fromStatus]}</Badge>}
                <span className="text-muted-foreground">→</span>
                <Badge variant={statusVariants[entry.toStatus]}>{statusLabels[entry.toStatus]}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{formatDateTime(entry.actionAt)}</span>
            </div>
            {entry.note && <p className="mt-2 text-sm">{entry.note}</p>}
            {entry.actionByName && (
              <p className="mt-1 text-xs text-muted-foreground">Người thao tác: {entry.actionByName}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Quản lý phiếu chi</h2>
          <p className="text-sm text-muted-foreground">Tạo, duyệt và theo dõi các khoản chi của công ty</p>
        </div>
        {(isAccountant || isAdmin) && (
          <div className="flex gap-2">
            <Button onClick={handleOpenCreate}>Tạo phiếu chi</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Tổng đã duyệt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-green-600">
              {summaryQuery.data ? formatCurrency(summaryQuery.data.totalApproved) : '...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryQuery.data ? `${summaryQuery.data.approvedCount} phiếu` : '---'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Đang chờ duyệt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-amber-600">
              {summaryQuery.data ? formatCurrency(summaryQuery.data.totalPending) : '...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryQuery.data ? `${summaryQuery.data.pendingCount} phiếu` : '---'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Đã từ chối</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-red-600">
              {summaryQuery.data ? formatCurrency(summaryQuery.data.totalRejected) : '...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryQuery.data ? `${summaryQuery.data.rejectedCount} phiếu` : '---'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Số dư ví công ty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {summaryQuery.data ? formatCurrency(summaryQuery.data.walletBalance) : '...'}
            </div>
            <p className="text-xs text-muted-foreground">Tổng các ví đang theo dõi</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Danh sách phiếu chi</CardTitle>
            <p className="text-sm text-muted-foreground">Lọc theo trạng thái, danh mục và thời gian</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={statusFilterValue as string} onValueChange={(value) => applyFilters({ status: value === 'ALL' ? undefined : (value as ExpenseVoucherStatus) })}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="DRAFT">{statusLabels.DRAFT}</SelectItem>
                <SelectItem value="PENDING">{statusLabels.PENDING}</SelectItem>
                <SelectItem value="APPROVED">{statusLabels.APPROVED}</SelectItem>
                <SelectItem value="REJECTED">{statusLabels.REJECTED}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilterValue as string} onValueChange={(value) => applyFilters({ category: value === 'ALL' ? undefined : (value as ExpenseVoucherCategory) })}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                {(Object.keys(categoryLabels) as ExpenseVoucherCategory[]).map((category) => (
                  <SelectItem key={category} value={category}>
                    {categoryLabels[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePickerField
              value={filters.from ?? ''}
              onChange={(value) => applyFilters({ from: value || undefined })}
              placeholder="Từ ngày"
              allowClear
            />
            <DatePickerField
              value={filters.to ?? ''}
              onChange={(value) => applyFilters({ to: value || undefined })}
              placeholder="Đến ngày"
              allowClear
            />
            <Button variant="outline" onClick={() => applyFilters({ status: undefined, category: undefined, from: undefined, to: undefined })}>
              Xóa lọc
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vouchersQuery.isLoading ? (
            <div className="py-6 text-center text-muted-foreground">Đang tải dữ liệu...</div>
          ) : vouchers.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">Chưa có phiếu chi nào với bộ lọc hiện tại</div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phiếu</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Người tạo</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-medium">{voucher.code || `#${voucher.id}`}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{voucher.title}</span>
                          {voucher.note && <span className="text-xs text-muted-foreground">{voucher.note}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoryLabels[voucher.category]}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-900">
                        {formatCurrency(voucher.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[voucher.status]}>{statusLabels[voucher.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{voucher.createdByName || voucher.createdBy}</span>
                          <span className="text-xs text-muted-foreground">{voucher.payeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(voucher.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openHistoryDialog(voucher)}>
                            Chi tiết
                          </Button>
                          {voucher.attachments.length > 0 && (
                            <Button size="sm" variant="ghost" onClick={() => openAttachment(voucher.attachments[0])}>
                              Xem file
                            </Button>
                          )}
                          {voucher.status === 'DRAFT' && isAccountant && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(voucher, 'PENDING')}
                              disabled={statusMutation.isPending}
                            >
                              Gửi duyệt
                            </Button>
                          )}
                          {voucher.status === 'PENDING' && isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(voucher, 'APPROVED')}
                                disabled={statusMutation.isPending}
                              >
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusChange(voucher, 'REJECTED')}
                                disabled={statusMutation.isPending}
                              >
                                Từ chối
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Trang {((filters.page ?? 0) + 1)} / {Math.max(1, Math.ceil((vouchersQuery.data?.total ?? 0) / (filters.size ?? 20)))}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(filters.page ?? 0) === 0}
                    onClick={() => applyFilters({ page: Math.max(0, (filters.page ?? 0) - 1) })}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(filters.page ?? 0) >= Math.ceil((vouchersQuery.data?.total ?? 0) / (filters.size ?? 20)) - 1}
                    onClick={() => applyFilters({ page: (filters.page ?? 0) + 1 })}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        if (!open) {
          setIsFormOpen(false);
          setHistoryVoucherId(null);
      setCurrentVoucher(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{formState.id ? 'Chi tiết phiếu chi' : 'Tạo phiếu chi'}</DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'history')}>
            <TabsList>
              <TabsTrigger value="details">Thông tin</TabsTrigger>
              <TabsTrigger value="history" disabled={!historyVoucherId}>Lịch sử</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Tiêu đề *</label>
                  <Input
                    value={formState.title}
                    disabled={!canEditForm}
                    onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Danh mục *</label>
                  <Select
                    value={formState.category}
                    disabled={!canEditForm}
                    onValueChange={(value: ExpenseVoucherCategory) => setFormState((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(categoryLabels) as ExpenseVoucherCategory[]).map((category) => (
                        <SelectItem key={category} value={category}>
                          {categoryLabels[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Số tiền (₫) *</label>
                  <Input
                    type="number"
                    min={0}
                    value={formState.amount}
                    disabled={!canEditForm}
                    onChange={(event) => setFormState((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Người nhận *</label>
                  <Input
                    value={formState.payeeName}
                    disabled={!canEditForm}
                    onChange={(event) => setFormState((prev) => ({ ...prev, payeeName: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Tài khoản nhận</label>
                  <Input
                    value={formState.payeeAccount}
                    disabled={!canEditForm}
                    onChange={(event) => setFormState((prev) => ({ ...prev, payeeAccount: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Ví công ty</label>
                  <Input
                    placeholder="ID ví (tuỳ chọn)"
                    value={formState.walletId}
                    disabled={!canEditForm}
                    onChange={(event) => setFormState((prev) => ({ ...prev, walletId: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Mô tả</label>
                <Textarea
                  rows={3}
                  value={formState.description}
                  disabled={!canEditForm}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Ghi chú</label>
                <Textarea
                  rows={3}
                  value={formState.note}
                  disabled={!canEditForm}
                  onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                <Button variant="outline" disabled={isUploading || !canEditForm} onClick={() => fileInputRef.current?.click()}>
                  {selectedFiles.length ? `Thêm ảnh (${selectedFiles.length}/${MAX_VOUCHER_IMAGES})` : 'Đính kèm ảnh (tối đa 3)'}
                </Button>
                {selectedFiles.length > 0 && (
                  <Button variant="ghost" onClick={() => setSelectedFiles([])} disabled={!canEditForm}>
                    Xóa ảnh
                  </Button>
                )}
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={formState.submitImmediately}
                    disabled={!canEditForm}
                    onChange={(event) => setFormState((prev) => ({ ...prev, submitImmediately: event.target.checked }))}
                  />
                  Gửi duyệt ngay
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, idx) => (
                    <Badge key={`${file.name}-${idx}`} variant="outline">
                      {file.name}
                    </Badge>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="history" className="pt-4">
              {renderHistory()}
            </TabsContent>
          </Tabs>
          {currentVoucher && currentVoucher.status !== 'DRAFT' && currentVoucher.status !== 'PENDING' && (
            <div className="rounded-md border border-dashed border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800">
              Phiếu chi đã hoàn tất, chỉ xem được thông tin.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Đóng
            </Button>
            {(isAccountant || isAdmin) && (currentVoucher ? currentVoucher.status === 'DRAFT' || currentVoucher.status === 'PENDING' : true) && (
              <Button onClick={handleSubmitForm} disabled={isSubmitting}>
                {formState.id ? 'Lưu thay đổi' : 'Tạo phiếu'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseVouchersPage;
