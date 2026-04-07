import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
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
import { PaginationControls } from '@/components/PaginationControls';
import { Plus, Download } from 'lucide-react';
import { apiService } from '@/services/apiService';
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
import { getDrivers } from '@/data/drivers';
import {
  getDriverExpenseAdvances,
  updateDriverExpenseAdvanceStatus,
  type DriverExpenseStatus,
  type DriverExpenseType,
  type DriverExpenseAdvance,
  type PaymentAttachment,
} from '@/data/accounting';

const statusLabels: Record<ExpenseVoucherStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PAID: 'Đã chuyển tiền',
  REJECTED: 'Từ chối',
};

const statusVariants: Record<ExpenseVoucherStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline',
  PENDING: 'secondary',
  APPROVED: 'default',
  PAID: 'default',
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

const driverStatusLabels: Record<DriverExpenseStatus, string> = {
  requested: 'Chờ duyệt',
  approved: 'Đã duyệt',
  transferred: 'Đã chuyển tiền',
  deducted: 'Đã khấu trừ',
  rejected: 'Từ chối',
};

const driverStatusVariants: Record<DriverExpenseStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  requested: 'outline',
  approved: 'secondary',
  transferred: 'secondary',
  deducted: 'default',
  rejected: 'destructive',
};

const driverExpenseLabels: Record<DriverExpenseType, string> = {
  toll: 'Phí cầu đường',
  parking: 'Phí bến bãi',
  fuel: 'Nhiên liệu',
  other: 'Khác',
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

const getCurrentMonthRange = () => {
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { from: format(fromDate), to: format(toDate) };
};

const ExpenseVouchersPage: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const currentMonthRange = useMemo(() => getCurrentMonthRange(), []);

  const [filters, setFilters] = useState<ExpenseVoucherQuery>(() => ({
    status: undefined,
    size: 20,
    page: 0,
    from: currentMonthRange.from,
    to: currentMonthRange.to,
  }));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<VoucherFormState>(defaultFormState);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [historyVoucherId, setHistoryVoucherId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [currentVoucher, setCurrentVoucher] = useState<ExpenseVoucher | null>(null);
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [driverStatusFilter, setDriverStatusFilter] = useState<'all' | DriverExpenseStatus>('all');
  const [driverAdvancePreview, setDriverAdvancePreview] = useState<DriverExpenseAdvance | null>(null);
  const [driverAdvanceAttachmentUrls, setDriverAdvanceAttachmentUrls] = useState<string[]>([]);
  const driverAdvanceAttachmentUrlsRef = useRef<string[]>([]);
  const [voucherAttachmentUrls, setVoucherAttachmentUrls] = useState<string[]>([]);
  const voucherAttachmentUrlsRef = useRef<string[]>([]);
  const [depositImages, setDepositImages] = useState<File[]>([]);
  const depositFileInputRef = useRef<HTMLInputElement | null>(null);
  const [depositImagesLoading, setDepositImagesLoading] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [isDriverExpenseTab, setIsDriverExpenseTab] = useState(false);
  const [driverAdvanceImageIndex, setDriverAdvanceImageIndex] = useState(0);
  const [isConfirmPaymentDialogOpen, setIsConfirmPaymentDialogOpen] = useState(false);
  const [voucherToConfirm, setVoucherToConfirm] = useState<ExpenseVoucher | null>(null);
  const [paymentImages, setPaymentImages] = useState<File[]>([]);
  const [paymentNote, setPaymentNote] = useState('');
  const paymentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [paymentImagesLoading, setPaymentImagesLoading] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isAuthenticated = !!user;

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

  const driversQuery = useQuery<any[], Error>({
    queryKey: ['drivers'],
    queryFn: getDrivers,
    enabled: isAuthenticated && (isAccountant || isAdmin),
  });

  const driverAdvancesQuery = useQuery<DriverExpenseAdvance[], Error>({
    queryKey: ['driver-advances', driverStatusFilter, selectedDriverFilter],
    queryFn: () =>
      getDriverExpenseAdvances({
        status: driverStatusFilter === 'all' ? undefined : driverStatusFilter,
        driverId: selectedDriverFilter || undefined,
      }),
    enabled: isAuthenticated && (isAccountant || isAdmin),
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

  const openHistoryDialog = (voucher: ExpenseVoucher, initialTab: 'details' | 'history' = 'history') => {
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
    setActiveTab(initialTab);
  };

  const formatCurrency = (amount: number) => amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('vi-VN', { hour12: false });
  };

  const voucherAttachmentGroups = useMemo(() => {
    if (!currentVoucher?.attachments?.length) {
      return {
        initial: [] as Array<{ attachment: PaymentAttachment; index: number }>,
        payment: [] as Array<{ attachment: PaymentAttachment; index: number }>,
      };
    }
    const paidAtTime = currentVoucher.paidAt ? new Date(currentVoucher.paidAt).getTime() : null;
    const groups = {
      initial: [] as Array<{ attachment: PaymentAttachment; index: number }>,
      payment: [] as Array<{ attachment: PaymentAttachment; index: number }>,
    };
    currentVoucher.attachments.forEach((attachment, index) => {
      const createdAt = new Date(attachment.createdAt).getTime();
      const target = paidAtTime && !Number.isNaN(paidAtTime) && !Number.isNaN(createdAt) && createdAt >= paidAtTime
        ? groups.payment
        : groups.initial;
      target.push({ attachment, index });
    });
    return groups;
  }, [currentVoucher]);

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

  const renderAttachmentGroup = (label: string, items: Array<{ attachment: PaymentAttachment; index: number }>) => {
    if (!items.length) {
      return null;
    }

    const isImageFile = (attachment: PaymentAttachment) => {
      if (attachment.contentType) {
        return attachment.contentType.toLowerCase().startsWith('image/');
      }
      return /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(attachment.fileName);
    };

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <div className="space-y-1">
          {items.map(({ attachment, index }) => {
            const previewUrl = voucherAttachmentUrls[index];
            const isImage = isImageFile(attachment);

            return (
              <div
                key={`${attachment.id}-${index}`}
                className="flex items-center gap-3 rounded-md border bg-white p-2 shadow-sm hover:bg-gray-50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                  {isImage && previewUrl ? (
                    <img src={previewUrl} alt={attachment.fileName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      📄
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" title={attachment.fileName}>
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(attachment.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => openAttachment(attachment)}
                >
                  Xem
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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

  const driverAdvanceStatusMut = useMutation<DriverExpenseAdvance, Error, { id: string; status: DriverExpenseStatus; actionUserId: string; note?: string; rejectionReason?: string }>({
    mutationFn: (payload) => updateDriverExpenseAdvanceStatus(payload),
    onSuccess: (updatedAdvance) => {
      toast({
        title: 'Đã cập nhật',
        description: 'Trạng thái phiếu ứng phí đã được cập nhật',
      });
      qc.invalidateQueries({ queryKey: ['driver-advances'] });
      setDriverAdvancePreview(null);
      setApprovalNote('');
      setDepositImages([]);
    },
    onError: (e: unknown) => {
      toast({
        title: 'Lỗi',
        description: (e instanceof Error ? e.message : String(e)) || 'Không thể cập nhật trạng thái',
        variant: 'destructive',
      });
    },
  });

  const autoCreateDriverAdvanceVoucherMut = useMutation<ExpenseVoucher, Error, CreateExpenseVoucherInput>({
    mutationFn: (input) => createExpenseVoucher(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-vouchers'] });
      qc.invalidateQueries({ queryKey: ['expense-voucher-summary'] });
    },
    onError: (error) => {
      toast({
        title: 'Không thể tạo phiếu chi cho tạm ứng tài xế',
        description: error instanceof Error ? error.message : 'Vui lòng kiểm tra lại trong tab Phiếu chi',
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
    if (!formState.title || Number.isNaN(amount) || amount <= 0) {
      toast({ title: 'Thiếu thông tin', description: 'Kiểm tra lại tiêu đề và số tiền', variant: 'destructive' });
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

    // Nếu là xác nhận chuyển tiền, mở dialog để upload ảnh
    if (status === 'PAID') {
      setVoucherToConfirm(voucher);
      setPaymentImages([]);
      setPaymentNote('');
      setIsConfirmPaymentDialogOpen(true);
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

  const handleConfirmPayment = () => {
    if (!voucherToConfirm || !user?.id) {
      return;
    }

    if (paymentImages.length === 0) {
      toast({
        title: 'Thiếu ảnh chuyển tiền',
        description: 'Vui lòng upload ít nhất 1 ảnh chuyển tiền',
        variant: 'destructive'
      });
      return;
    }

    statusMutation.mutate({
      id: voucherToConfirm.id,
      status: 'PAID',
      actionUserId: user.id.toString(),
      note: paymentNote || null,
      attachments: paymentImages,
    }, {
      onSuccess: () => {
        setIsConfirmPaymentDialogOpen(false);
        setVoucherToConfirm(null);
        setPaymentImages([]);
        setPaymentNote('');
      },
    });
  };

  const handlePaymentImagesSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (!files.length) {
      return;
    }
    if (files.length > MAX_VOUCHER_IMAGES) {
      toast({
        title: 'Quá số lượng ảnh',
        description: `Chỉ được chọn tối đa ${MAX_VOUCHER_IMAGES} ảnh`,
        variant: 'destructive',
      });
      return;
    }
    setPaymentImagesLoading(true);
    try {
      const compressed = await compressImages(files);
      setPaymentImages(compressed);
    } catch (error) {
      toast({
        title: 'Không thể xử lý ảnh',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    } finally {
      setPaymentImagesLoading(false);
    }
  };

  const applyFilters = (partial: Partial<ExpenseVoucherQuery>) => {
    setFilters((prev) => ({
      ...prev,
      ...partial,
      page: partial.page ?? 0,
    }));
  };

  const handleExportReport = async () => {
    if (!exportFromDate || !exportToDate) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng chọn khoảng thời gian',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const blob = await apiService.exportExpenseVouchers({
        from: exportFromDate,
        to: exportToDate,
        status: filters.status,
        category: filters.category,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `phieu-chi-${exportFromDate}-${exportToDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Xuất báo cáo thành công',
        description: 'File Excel đã được tải xuống',
      });
      setIsExportDialogOpen(false);
      setExportFromDate('');
      setExportToDate('');
    } catch (error) {
      toast({
        title: 'Lỗi xuất báo cáo',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const vouchers = vouchersQuery.data?.items ?? [];

  const statusFilterValue = filters.status ?? 'ALL';
  const categoryFilterValue = filters.category ?? 'ALL';

  const isSubmitting = createMutation.isPending || updateMutation.isPending || statusMutation.isPending;
  const canEditForm = !currentVoucher || currentVoucher.status === 'DRAFT' || currentVoucher.status === 'PENDING';

  useEffect(() => {
    const revokeAll = () => {
      driverAdvanceAttachmentUrlsRef.current.forEach((url) => url && URL.revokeObjectURL(url));
      driverAdvanceAttachmentUrlsRef.current = [];
    };

    revokeAll();
    setDriverAdvanceAttachmentUrls([]);

    if (!driverAdvancePreview || driverAdvancePreview.attachments.length === 0) {
      return () => {
        revokeAll();
      };
    }

    let cancelled = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const loadPreviews = async () => {
      const urls: string[] = [];
      for (const attachment of driverAdvancePreview.attachments) {
        try {
          const response = await fetch(attachment.downloadUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!response.ok) {
            throw new Error('Failed to load attachment');
          }
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          urls.push(objectUrl);
        } catch (error) {
          urls.push('');
        }
      }
      if (cancelled) {
        urls.forEach((url) => url && URL.revokeObjectURL(url));
        return;
      }
      driverAdvanceAttachmentUrlsRef.current = urls.filter((url) => !!url);
      setDriverAdvanceAttachmentUrls(urls);
    };

    loadPreviews();

    return () => {
      cancelled = true;
      revokeAll();
    };
  }, [driverAdvancePreview]);

  useEffect(() => {
    const revokeAll = () => {
      voucherAttachmentUrlsRef.current.forEach((url) => url && URL.revokeObjectURL(url));
      voucherAttachmentUrlsRef.current = [];
    };

    revokeAll();
    setVoucherAttachmentUrls([]);

    if (!currentVoucher || currentVoucher.attachments.length === 0) {
      return () => {
        revokeAll();
      };
    }

    let cancelled = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const loadPreviews = async () => {
      const urls: string[] = [];
      for (const attachment of currentVoucher.attachments) {
        try {
          const response = await fetch(attachment.downloadUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!response.ok) {
            throw new Error('Failed to load attachment');
          }
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          urls.push(objectUrl);
        } catch (_error) {
          urls.push('');
        }
      }
      if (cancelled) {
        urls.forEach((url) => url && URL.revokeObjectURL(url));
        return;
      }
      voucherAttachmentUrlsRef.current = urls.filter((url) => !!url);
      setVoucherAttachmentUrls(urls);
    };

    loadPreviews();

    return () => {
      cancelled = true;
      revokeAll();
    };
  }, [currentVoucher]);

  const handleApproveAdvance = (status: DriverExpenseStatus) => {
    if (!driverAdvancePreview || !user?.id) {
      toast({ title: 'Thiếu quyền', description: 'Vui lòng đăng nhập lại', variant: 'destructive' });
      return;
    }

    const trimmedNote = approvalNote.trim();
    const payload: {
      id: string;
      status: DriverExpenseStatus;
      actionUserId: string;
      note?: string;
      rejectionReason?: string;
    } = {
      id: driverAdvancePreview.id,
      status,
      actionUserId: user.id.toString(),
    };

    if (trimmedNote) {
      payload.note = trimmedNote;
    }
    if (status === 'rejected' && trimmedNote) {
      payload.rejectionReason = trimmedNote;
    }

    // Cập nhật trạng thái tạm ứng phí tài xế
    driverAdvanceStatusMut.mutate(payload, {
      onSuccess: (updatedAdvance) => {
        // Nếu duyệt phiếu (approved hoặc transferred) thì tự tạo 1 phiếu chi loại DRIVER_ADVANCE
        if ((status === 'approved' || status === 'transferred') && updatedAdvance) {
          const driver = driversQuery.data?.find((d) => d.id === updatedAdvance.driverId);
          const driverName = driver?.name || updatedAdvance.driverId;

          autoCreateDriverAdvanceVoucherMut.mutate({
            title: `Tạm ứng phí tài xế ${driverName}`,
            category: 'DRIVER_ADVANCE',
            amount: updatedAdvance.amount,
            payeeName: driverName,
            payeeAccount: null,
            description: updatedAdvance.tripId
              ? `Tạm ứng phí cho chuyến #${updatedAdvance.tripId}`
              : 'Tạm ứng phí tài xế',
            note: trimmedNote || null,
            actorId: user.id.toString(),
            walletId: null,
            driverExpenseAdvanceId: updatedAdvance.id,
            submitImmediately: true,
            attachments: depositImages,
          });
        }
      },
    });
  };

  const handleDepositImagesSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (!files.length) {
      return;
    }
    if (files.length > MAX_VOUCHER_IMAGES) {
      toast({
        title: 'Quá số lượng ảnh',
        description: `Chỉ được chọn tối đa ${MAX_VOUCHER_IMAGES} ảnh`,
        variant: 'destructive',
      });
      return;
    }
    setDepositImagesLoading(true);
    try {
      const compressed = await compressImages(files);
      setDepositImages(compressed);
    } catch (error) {
      toast({
        title: 'Không thể xử lý ảnh',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    } finally {
      setDepositImagesLoading(false);
    }
  };

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
          <h2 className="text-2xl font-semibold text-gray-900">Quản lý chi phí</h2>
          <p className="text-sm text-muted-foreground">Tạo, duyệt và theo dõi các khoản chi của công ty</p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs
            value={isDriverExpenseTab ? 'driver' : 'voucher'}
            onValueChange={(value) => setIsDriverExpenseTab(value === 'driver')}
          >
            <TabsList>
              <TabsTrigger value="voucher">Phiếu chi</TabsTrigger>
              <TabsTrigger value="driver">Chi phí tài xế</TabsTrigger>
            </TabsList>
          </Tabs>
          {(isAccountant || isAdmin) && !isDriverExpenseTab && (
            <div className="flex gap-2">
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo phiếu chi
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setExportFromDate(currentMonthRange.from);
                  setExportToDate(currentMonthRange.to);
                  setIsExportDialogOpen(true);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Xuất báo cáo Excel
              </Button>
            </div>
          )}
        </div>
      </div>

      {!isDriverExpenseTab && (
        <>
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
                <Select
                  value={statusFilterValue as string}
                  onValueChange={(value) =>
                    applyFilters({ status: value === 'ALL' ? undefined : (value as ExpenseVoucherStatus) })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="DRAFT">{statusLabels.DRAFT}</SelectItem>
                    <SelectItem value="PENDING">{statusLabels.PENDING}</SelectItem>
                    <SelectItem value="APPROVED">{statusLabels.APPROVED}</SelectItem>
                    <SelectItem value="PAID">{statusLabels.PAID}</SelectItem>
                    <SelectItem value="REJECTED">{statusLabels.REJECTED}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilterValue as string}
                  onValueChange={(value) =>
                    applyFilters({ category: value === 'ALL' ? undefined : (value as ExpenseVoucherCategory) })
                  }
                >
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
                <Button
                  variant="outline"
                  onClick={() =>
                    applyFilters({
                      status: undefined,
                      category: undefined,
                      from: currentMonthRange.from,
                      to: currentMonthRange.to,
                    })
                  }
                >
                  Xóa lọc
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vouchersQuery.isLoading ? (
                <div className="py-6 text-center text-muted-foreground">Đang tải dữ liệu...</div>
              ) : vouchers.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  Chưa có phiếu chi nào với bộ lọc hiện tại
                </div>
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
                              {voucher.note && (
                                <span className="text-xs text-muted-foreground">{voucher.note}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{categoryLabels[voucher.category]}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-gray-900">
                            {formatCurrency(voucher.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariants[voucher.status]}>
                              {statusLabels[voucher.status]}
                            </Badge>
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
                              <Button size="sm" variant="outline" onClick={() => openHistoryDialog(voucher, 'history')}>
                                Chi tiết
                              </Button>
                              {voucher.attachments.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openHistoryDialog(voucher, 'details')}
                                >
                                  Xem ảnh
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
                              {voucher.status === 'APPROVED' &&
                                isAccountant && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleStatusChange(voucher, 'PAID')}
                                    disabled={statusMutation.isPending}
                                  >
                                    Xác nhận chuyển tiền
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {vouchersQuery.data && (
                    <div className="pt-4 border-t">
                      <PaginationControls
                        currentPage={filters.page || 0}
                        totalPages={vouchersQuery.data.totalPages}
                        pageSize={filters.size || 20}
                        totalItems={vouchersQuery.data.total}
                        onPageChange={(page) => applyFilters({ page })}
                        onPageSizeChange={(size) => applyFilters({ size, page: 0 })}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {isDriverExpenseTab && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Ứng phí tài xế</CardTitle>
                <p className="text-sm text-muted-foreground">Theo dõi và duyệt các khoản ứng phí</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={driverStatusFilter}
                  onValueChange={(value) => setDriverStatusFilter(value as 'all' | DriverExpenseStatus)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="requested">Chờ duyệt</SelectItem>
                    <SelectItem value="approved">Đã duyệt</SelectItem>
                    <SelectItem value="transferred">Đã chuyển tiền</SelectItem>
                    <SelectItem value="deducted">Đã khấu trừ</SelectItem>
                    <SelectItem value="rejected">Từ chối</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedDriverFilter || 'all'}
                  onValueChange={(value) => setSelectedDriverFilter(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Lọc theo tài xế" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả tài xế</SelectItem>
                    {driversQuery.data?.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} - {driver.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {driverAdvancesQuery.isLoading ? (
                <div className="py-6 text-center text-muted-foreground">Đang tải dữ liệu...</div>
              ) : driverAdvancesQuery.data?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã phiếu</TableHead>
                      <TableHead>Tài xế</TableHead>
                      <TableHead>Mã chuyến</TableHead>
                      <TableHead>Loại chi phí</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverAdvancesQuery.data.map((advance) => {
                      const driver = driversQuery.data?.find((d) => d.id === advance.driverId);
                      return (
                        <TableRow key={advance.id}>
                          <TableCell className="font-medium">{advance.id}</TableCell>
                          <TableCell>{driver?.name || advance.driverId}</TableCell>
                          <TableCell>{advance.tripId ? `#${advance.tripId}` : '--'}</TableCell>
                          <TableCell>{driverExpenseLabels[advance.expenseType]}</TableCell>
                          <TableCell>{advance.amount.toLocaleString('vi-VN')} đ</TableCell>
                          <TableCell>{formatDateTime(advance.requestedAt)}</TableCell>
                          <TableCell>
                            <Badge variant={driverStatusVariants[advance.status]}>
                              {driverStatusLabels[advance.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDriverAdvancePreview(advance);
                                setDriverAdvanceImageIndex(0);
                                setApprovalNote('');
                              }}
                            >
                              Xem chi tiết
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  Chưa có phiếu ứng phí nào với bộ lọc hiện tại
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                  <label className="text-sm text-muted-foreground">Người nhận</label>
                  <Input
                    value={formState.payeeName}
                    disabled={!canEditForm}
                    placeholder="Tên người nhận (không bắt buộc)"
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
              {currentVoucher && currentVoucher.attachments.length > 0 && (
                <div className="space-y-3 rounded-md border border-dashed border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-800">Tệp đính kèm đã lưu</h4>
                    <span className="text-xs text-muted-foreground">
                      Tổng {currentVoucher.attachments.length} tệp
                    </span>
                  </div>
                  {voucherAttachmentUrls.length === 0 && (
                    <p className="text-xs text-muted-foreground">Đang tải hình ảnh...</p>
                  )}
                  {renderAttachmentGroup('Ảnh nộp kèm phiếu', voucherAttachmentGroups.initial)}
                  {renderAttachmentGroup(
                    currentVoucher.paidAt ? 'Ảnh chuyển tiền' : 'Ảnh bổ sung',
                    voucherAttachmentGroups.payment,
                  )}
                  {voucherAttachmentGroups.initial.length === 0 && voucherAttachmentGroups.payment.length === 0 && (
                    <p className="text-xs text-muted-foreground">Không có tệp đính kèm.</p>
                  )}
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
      <Dialog
        open={!!driverAdvancePreview}
        onOpenChange={(open) => {
          if (!open) {
            setDriverAdvancePreview(null);
            setApprovalNote('');
            setDepositImages([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết phiếu ứng phí tài xế</DialogTitle>
          </DialogHeader>
          {driverAdvancePreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mã phiếu</p>
                  <p className="font-medium">{driverAdvancePreview.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tài xế</p>
                  <p className="font-medium">
                    {driversQuery.data?.find((d) => d.id === driverAdvancePreview.driverId)?.name
                      || `#${driverAdvancePreview.driverId}`}
                  </p>
                </div>
                {driverAdvancePreview.tripId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Chuyến</p>
                    <p className="font-medium">#{driverAdvancePreview.tripId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Loại chi phí</p>
                  <p className="font-medium">
                    {driverExpenseLabels[driverAdvancePreview.expenseType]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số tiền</p>
                  <p className="font-medium">
                    {driverAdvancePreview.amount.toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ngày yêu cầu</p>
                  <p className="font-medium">{formatDateTime(driverAdvancePreview.requestedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trạng thái</p>
                  <Badge variant={driverStatusVariants[driverAdvancePreview.status]}>
                    {driverStatusLabels[driverAdvancePreview.status]}
                  </Badge>
                </div>
                {driverAdvancePreview.note && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Ghi chú từ tài xế</p>
                    <p className="whitespace-pre-wrap">{driverAdvancePreview.note}</p>
                  </div>
                )}
              </div>

              {driverAdvancePreview.attachments?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Hình ảnh tài xế gửi lên</p>
                  <div className="grid grid-cols-3 gap-2">
                    {driverAdvancePreview.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="relative aspect-video bg-gray-100 rounded-md overflow-hidden"
                      >
                        <img
                          src={driverAdvanceAttachmentUrls[index] || ''}
                          alt={`Hình ảnh ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {driverAdvancePreview.status === 'requested' && (isAccountant || isAdmin) && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium mb-2">Xác nhận phiếu ứng phí</p>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Ghi chú cho quyết định duyệt / từ chối (nếu có)"
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                      />
                      <div>
                        <input
                          type="file"
                          ref={depositFileInputRef}
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleDepositImagesSelect}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => depositFileInputRef.current?.click()}
                          disabled={depositImagesLoading}
                        >
                          {depositImagesLoading ? 'Đang xử lý ảnh...' : 'Tải lên ảnh xác nhận chi'}
                        </Button>
                        {depositImages.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Đã chọn {depositImages.length} ảnh xác nhận
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDriverAdvancePreview(null);
                            setApprovalNote('');
                            setDepositImages([]);
                          }}
                        >
                          Đóng
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleApproveAdvance('rejected')}
                          disabled={driverAdvanceStatusMut.isPending}
                        >
                          Từ chối
                        </Button>
                        <Button
                          onClick={() => handleApproveAdvance('approved')}
                          disabled={driverAdvanceStatusMut.isPending}
                        >
                          Duyệt phiếu
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {driverAdvancePreview.status === 'approved' && isAccountant && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium mb-2">Xác nhận đã chuyển tiền cho tài xế</p>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Ghi chú hoặc thông tin giao dịch (nếu có)"
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                      />
                      <div>
                        <input
                          type="file"
                          ref={depositFileInputRef}
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleDepositImagesSelect}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => depositFileInputRef.current?.click()}
                          disabled={depositImagesLoading}
                        >
                          {depositImagesLoading ? 'Đang xử lý ảnh...' : 'Tải lên ảnh chuyển tiền (nếu có)'}
                        </Button>
                        {depositImages.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Đã chọn {depositImages.length} ảnh chuyển tiền
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDriverAdvancePreview(null);
                            setApprovalNote('');
                            setDepositImages([]);
                          }}
                        >
                          Đóng
                        </Button>
                        <Button
                          onClick={() => handleApproveAdvance('transferred')}
                          disabled={driverAdvanceStatusMut.isPending}
                        >
                          Xác nhận đã chuyển tiền
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isConfirmPaymentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsConfirmPaymentDialogOpen(false);
            setVoucherToConfirm(null);
            setPaymentImages([]);
            setPaymentNote('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Xác nhận chuyển tiền</DialogTitle>
          </DialogHeader>
          {voucherToConfirm && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Mã phiếu</p>
                    <p className="font-medium">{voucherToConfirm.code || `#${voucherToConfirm.id}`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tiêu đề</p>
                    <p className="font-medium">{voucherToConfirm.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Số tiền</p>
                    <p className="font-medium text-lg">{formatCurrency(voucherToConfirm.amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Người nhận</p>
                    <p className="font-medium">{voucherToConfirm.payeeName}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ghi chú (nếu có)</label>
                <Textarea
                  placeholder="Nhập ghi chú về việc chuyển tiền..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ảnh chuyển tiền *</label>
                <p className="text-xs text-muted-foreground">
                  Upload ảnh chứng từ chuyển tiền (tối đa {MAX_VOUCHER_IMAGES} ảnh)
                </p>
                <input
                  type="file"
                  ref={paymentFileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handlePaymentImagesSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => paymentFileInputRef.current?.click()}
                  disabled={paymentImagesLoading}
                >
                  {paymentImagesLoading ? 'Đang xử lý ảnh...' : 'Chọn ảnh chuyển tiền'}
                </Button>
                {paymentImages.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Đã chọn {paymentImages.length} ảnh:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {paymentImages.map((file, idx) => (
                        <Badge key={`${file.name}-${idx}`} variant="outline">
                          {file.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-medium mb-1">Lưu ý:</p>
                <p>Vui lòng upload ảnh chứng từ chuyển tiền để xác nhận. Hệ thống sẽ trừ tiền từ ví công ty sau khi xác nhận.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmPaymentDialogOpen(false);
                setVoucherToConfirm(null);
                setPaymentImages([]);
                setPaymentNote('');
              }}
              disabled={statusMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={statusMutation.isPending || paymentImages.length === 0}
            >
              {statusMutation.isPending ? 'Đang xử lý...' : 'Xác nhận chuyển tiền'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xuất báo cáo thu chi công nợ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Từ ngày *</label>
              <DatePickerField
                value={exportFromDate}
                onChange={(value) => setExportFromDate(value || '')}
                placeholder="Chọn ngày bắt đầu"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Đến ngày *</label>
              <DatePickerField
                value={exportToDate}
                onChange={(value) => setExportToDate(value || '')}
                placeholder="Chọn ngày kết thúc"
              />
            </div>
            <div className="rounded-md border border-dashed border-blue-300 bg-blue-50 p-3 text-xs text-blue-800">
              <p className="font-medium mb-1">Lưu ý:</p>
              <p>Báo cáo sẽ bao gồm: Tổng quan, Chi tiết thu, Chi tiết chi, Công nợ khách hàng, Công nợ tài xế</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsExportDialogOpen(false);
                setExportFromDate('');
                setExportToDate('');
              }}
              disabled={isExporting}
            >
              Hủy
            </Button>
            <Button
              onClick={handleExportReport}
              disabled={isExporting || !exportFromDate || !exportToDate}
            >
              {isExporting ? 'Đang xuất...' : 'Xuất báo cáo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseVouchersPage;
