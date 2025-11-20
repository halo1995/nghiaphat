import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRevenueSummary,
  createDeposit,
  getDeposits,
  getPayments,
  recordTripPayment,
  getCustomerAdvances,
  getDriverExpenseAdvances,
  updateCustomerAdvanceStatus,
  updateDriverExpenseAdvanceStatus,
} from '@/data/accounting';
import { getDrivers } from '@/data/drivers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  CustomerAdvancePayment,
  CustomerAdvanceStatus,
  DriverExpenseAdvance,
  DriverExpenseStatus,
  DriverExpenseType,
  PaymentAttachment,
} from '@/data/accounting';
import { compressImages, MAX_VOUCHER_IMAGES } from '@/utils/imageCompression';

const getCurrentMonthRange = () => {
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { from: format(fromDate), to: format(toDate) };
};

const Accounting: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const currentMonthRange = useMemo(() => getCurrentMonthRange(), []);

  const [dateFrom, setDateFrom] = useState<string>(() => currentMonthRange.from);
  const [dateTo, setDateTo] = useState<string>(() => currentMonthRange.to);
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | CustomerAdvanceStatus>('all');
  const [driverStatusFilter, setDriverStatusFilter] = useState<'all' | DriverExpenseStatus>('all');
  const [depositValues, setDepositValues] = useState<Record<string, string>>({});
  const [paymentForm, setPaymentForm] = useState({
    tripId: '',
    driverId: '',
    amount: '',
    method: 'cash' as 'cash' | 'transfer',
  });
  const [paymentImages, setPaymentImages] = useState<File[]>([]);
  const paymentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [paymentImagesLoading, setPaymentImagesLoading] = useState(false);
  const [depositAttachments, setDepositAttachments] = useState<Record<string, File[]>>({});
  const [depositAttachmentTarget, setDepositAttachmentTarget] = useState<string | null>(null);
  const depositFileInputRef = useRef<HTMLInputElement | null>(null);
  const [depositImagesLoading, setDepositImagesLoading] = useState(false);
  const [previewAdvance, setPreviewAdvance] = useState<CustomerAdvancePayment | null>(null);
  const [previewAction, setPreviewAction] = useState<CustomerAdvanceStatus | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number>(0);
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [customerAttachmentPreviewUrls, setCustomerAttachmentPreviewUrls] = useState<string[]>([]);
  const customerAttachmentPreviewUrlsRef = useRef<string[]>([]);
  const [driverAttachmentPreviewUrls, setDriverAttachmentPreviewUrls] = useState<string[]>([]);
  const driverAttachmentPreviewUrlsRef = useRef<string[]>([]);
  const [driverAdvancePreview, setDriverAdvancePreview] = useState<DriverExpenseAdvance | null>(null);
  const [driverAdvanceImageIndex, setDriverAdvanceImageIndex] = useState(0);
  const [activePreviewTab, setActivePreviewTab] = useState<'customer' | 'driver'>('customer');

  const isAccountant = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const customerStatusLabels: Record<CustomerAdvanceStatus, string> = {
    pending: 'Chờ nộp',
    submitted: 'Đã chuyển kế toán',
    reconciled: 'Đã đối soát',
    rejected: 'Từ chối',
  };

  const customerStatusVariants: Record<CustomerAdvanceStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
    pending: 'outline',
    submitted: 'secondary',
    reconciled: 'default',
    rejected: 'destructive',
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

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }
    return date.toLocaleString('vi-VN', { hour12: false });
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

  const handleDepositImagesSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (!depositAttachmentTarget || !files.length) {
      setDepositAttachmentTarget(null);
      return;
    }
    if (files.length > MAX_VOUCHER_IMAGES) {
      toast({
        title: 'Quá số lượng ảnh',
        description: `Chỉ được chọn tối đa ${MAX_VOUCHER_IMAGES} ảnh`,
        variant: 'destructive',
      });
      setDepositAttachmentTarget(null);
      return;
    }
    setDepositImagesLoading(true);
    try {
      const compressed = await compressImages(files);
      setDepositAttachments((prev) => ({
        ...prev,
        [depositAttachmentTarget]: compressed,
      }));
    } catch (error) {
      toast({
        title: 'Không thể xử lý ảnh',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    } finally {
      setDepositImagesLoading(false);
      setDepositAttachmentTarget(null);
    }
  };

  const dateFromObj = useMemo(() => (dateFrom ? new Date(dateFrom) : undefined), [dateFrom]);
  const dateToObj = useMemo(() => (dateTo ? new Date(dateTo) : undefined), [dateTo]);

  const driversQ = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
    enabled: isAuthenticated && isAccountant,
  });

  const summaryQ = useQuery({
    queryKey: ['revenue-summary', dateFrom, dateTo],
    queryFn: () => getRevenueSummary(dateFromObj, dateToObj),
    enabled: isAuthenticated && isAccountant,
  });

  const depositsQ = useQuery({
    queryKey: ['deposits'],
    queryFn: getDeposits,
    enabled: isAuthenticated && isAccountant,
  });

  const paymentsQ = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
    enabled: isAuthenticated && isAccountant,
  });

  const customerAdvancesQ = useQuery({
    queryKey: ['customer-advances', customerStatusFilter],
    queryFn: () =>
      getCustomerAdvances(
        customerStatusFilter === 'all' ? undefined : { status: customerStatusFilter },
      ),
    enabled: isAuthenticated && isAccountant,
  });

  const driverAdvancesQ = useQuery({
    queryKey: ['driver-advances', driverStatusFilter, selectedDriverFilter],
    queryFn: () =>
      getDriverExpenseAdvances({
        status: driverStatusFilter === 'all' ? undefined : driverStatusFilter,
        driverId: selectedDriverFilter || undefined,
      }),
    enabled: isAuthenticated && isAccountant,
  });

  const depositMut = useMutation({
    mutationFn: createDeposit,
    onSuccess: (_data, variables) => {
      toast({ title: 'Đã nộp tiền', description: 'Cập nhật công nợ tài xế thành công' });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['revenue-summary'] });
      qc.invalidateQueries({ queryKey: ['deposits'] });
      if (variables?.driverId) {
        setDepositAttachments((prev) => {
          const next = { ...prev };
          delete next[variables.driverId];
          return next;
        });
      }
      if (depositFileInputRef.current) {
        depositFileInputRef.current.value = '';
      }
    },
    onError: (e: unknown) => {
      toast({
        title: 'Lỗi',
        description: (e instanceof Error ? e.message : String(e)) || 'Không thể nộp tiền',
        variant: 'destructive',
      });
    },
  });

  const paymentMut = useMutation({
    mutationFn: recordTripPayment,
    onSuccess: () => {
      toast({ title: 'Đã ghi nhận', description: 'Tăng công nợ tài xế theo số tiền đã thu' });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['revenue-summary'] });
      setPaymentImages([]);
      if (paymentFileInputRef.current) {
        paymentFileInputRef.current.value = '';
      }
    },
    onError: (e: unknown) => {
      toast({
        title: 'Lỗi',
        description: (e instanceof Error ? e.message : String(e)) || 'Không thể ghi nhận thu tiền',
        variant: 'destructive',
      });
    },
  });

  const customerAdvanceStatusMut = useMutation({
    mutationFn: updateCustomerAdvanceStatus,
    onSuccess: () => {
      toast({ title: 'Đã cập nhật', description: 'Trạng thái phiếu ứng trước đã thay đổi' });
      qc.invalidateQueries({ queryKey: ['customer-advances'] });
      qc.invalidateQueries({ queryKey: ['revenue-summary'] });
      setPreviewAdvance(null);
      setPreviewAction(null);
      setPreviewImageIndex(0);
      setApprovalNote('');
    },
    onError: (e: unknown) => {
      toast({
        title: 'Không thể cập nhật',
        description: (e instanceof Error ? e.message : String(e)) || 'Vui lòng thử lại',
        variant: 'destructive',
      });
    },
  });

  const driverAdvanceStatusMut = useMutation({
    mutationFn: updateDriverExpenseAdvanceStatus,
    onSuccess: () => {
      toast({ title: 'Đã cập nhật', description: 'Trạng thái tạm ứng phí tài xế đã thay đổi' });
      qc.invalidateQueries({ queryKey: ['driver-advances'] });
      qc.invalidateQueries({ queryKey: ['revenue-summary'] });
    },
    onError: (e: unknown) => {
      toast({
        title: 'Không thể cập nhật',
        description: (e instanceof Error ? e.message : String(e)) || 'Vui lòng thử lại',
        variant: 'destructive',
      });
    },
  });

  const driverSummaries = summaryQ.data?.byDriver ?? [];
  const totalOutstanding = summaryQ.data?.totalOutstanding ?? 0;

  const handleCustomerAdvanceStatus = (record: CustomerAdvancePayment, status: CustomerAdvanceStatus) => {
    if (!user?.id) {
      toast({ title: 'Thiếu quyền', description: 'Vui lòng đăng nhập lại', variant: 'destructive' });
      return;
    }
    openAdvancePreview(record, status);
  };

  const handleDriverAdvanceStatus = (id: string, status: DriverExpenseStatus) => {
    if (!user?.id) {
      toast({ title: 'Thiếu quyền', description: 'Vui lòng đăng nhập lại', variant: 'destructive' });
      return;
    }
    let note: string | undefined;
    let rejectionReason: string | undefined;
    if (status === 'rejected') {
      const reason = typeof window !== 'undefined'
        ? window.prompt('Nhập lý do từ chối tạm ứng phí')?.trim()
        : '';
      if (!reason) {
        toast({ title: 'Đã hủy thao tác', description: 'Cần nhập lý do để từ chối tạm ứng', variant: 'destructive' });
        return;
      }
      note = reason;
      rejectionReason = reason;
    }
    if (status === 'deducted') {
      const desc = typeof window !== 'undefined'
        ? window.prompt('Ghi chú khi đã khấu trừ (có thể bỏ trống)')?.trim()
        : undefined;
      note = desc || undefined;
    }
    driverAdvanceStatusMut.mutate({ id, status, actionUserId: user.id.toString(), note, rejectionReason });
  };

  const openAttachment = useCallback(async (attachment: PaymentAttachment) => {
    if (typeof window === 'undefined') {
      return;
    }
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

  const customerAdvances = customerAdvancesQ.data ?? [];
  const driverAdvances = driverAdvancesQ.data ?? [];

  const openAdvancePreview = (record: CustomerAdvancePayment, action?: CustomerAdvanceStatus) => {
    setDriverAdvancePreview(null);
    setPreviewAdvance(record);
    setPreviewAction(action ?? null);
    setPreviewImageIndex(0);
    setApprovalNote('');
    setActivePreviewTab('customer');
  };

  const closeAdvancePreview = () => {
    setPreviewAdvance(null);
    setPreviewAction(null);
    setPreviewImageIndex(0);
    setApprovalNote('');
    setActivePreviewTab('customer');
    setDriverAdvancePreview(null);
    setDriverAdvanceImageIndex(0);
  };

  const showDriverAdvanceAttachments = (record: DriverExpenseAdvance) => {
    setPreviewAdvance(null);
    setPreviewAction(null);
    setPreviewImageIndex(0);
    setApprovalNote('');
    setDriverAdvancePreview(record);
    setDriverAdvanceImageIndex(0);
    setActivePreviewTab('driver');
  };

  const submitAdvanceApproval = () => {
    if (!previewAdvance || !previewAction) {
      closeAdvancePreview();
      return;
    }
    if (!user?.id) {
      toast({ title: 'Thiếu quyền', description: 'Vui lòng đăng nhập lại', variant: 'destructive' });
      return;
    }
    const trimmedNote = approvalNote.trim();
    if (previewAction === 'rejected' && !trimmedNote) {
      toast({ title: 'Thiếu lý do', description: 'Vui lòng nhập ghi chú khi từ chối phiếu', variant: 'destructive' });
      return;
    }
    customerAdvanceStatusMut.mutate({
      id: previewAdvance.id,
      status: previewAction,
      actionUserId: user.id.toString(),
      note: trimmedNote || undefined,
    });
  };

  useEffect(() => {
    const revokeAll = () => {
      customerAttachmentPreviewUrlsRef.current.forEach((url) => url && URL.revokeObjectURL(url));
      customerAttachmentPreviewUrlsRef.current = [];
    };

    revokeAll();
    setCustomerAttachmentPreviewUrls([]);

    if (!previewAdvance || previewAdvance.attachments.length === 0) {
      return () => {
        revokeAll();
      };
    }

    let cancelled = false;
    const token = localStorage.getItem('token');

    const loadPreviews = async () => {
      const urls: string[] = [];
      for (const attachment of previewAdvance.attachments) {
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
      customerAttachmentPreviewUrlsRef.current = urls.filter((url) => !!url);
      setCustomerAttachmentPreviewUrls(urls);
    };

    loadPreviews();

    return () => {
      cancelled = true;
      revokeAll();
    };
  }, [previewAdvance]);

  useEffect(() => {
    const revokeAll = () => {
      driverAttachmentPreviewUrlsRef.current.forEach((url) => url && URL.revokeObjectURL(url));
      driverAttachmentPreviewUrlsRef.current = [];
    };

    revokeAll();
    setDriverAttachmentPreviewUrls([]);

    if (!driverAdvancePreview || driverAdvancePreview.attachments.length === 0) {
      return () => {
        revokeAll();
      };
    }

    let cancelled = false;
    const token = localStorage.getItem('token');

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
      driverAttachmentPreviewUrlsRef.current = urls.filter((url) => !!url);
      setDriverAttachmentPreviewUrls(urls);
    };

    loadPreviews();

    return () => {
      cancelled = true;
      revokeAll();
    };
  }, [driverAdvancePreview]);

  useEffect(() => {
    const total = previewAdvance?.attachments?.length ?? 0;
    if (total === 0 && previewImageIndex !== 0) {
      setPreviewImageIndex(0);
      return;
    }
    if (previewImageIndex >= total && total > 0) {
      setPreviewImageIndex(0);
    }
  }, [previewAdvance, previewImageIndex]);

  useEffect(() => {
    const total = driverAdvancePreview?.attachments?.length ?? 0;
    if (total === 0 && driverAdvanceImageIndex !== 0) {
      setDriverAdvanceImageIndex(0);
      return;
    }
    if (driverAdvanceImageIndex >= total && total > 0) {
      setDriverAdvanceImageIndex(0);
    }
  }, [driverAdvancePreview, driverAdvanceImageIndex]);

  const filteredPayments = useMemo(() => {
    if (!paymentsQ.data) return [];
    if (!selectedDriverFilter) return paymentsQ.data;
    return paymentsQ.data.filter((payment) => payment.driverId === selectedDriverFilter);
  }, [paymentsQ.data, selectedDriverFilter]);

  const filteredDeposits = useMemo(() => {
    if (!depositsQ.data) return [];
    if (!selectedDriverFilter) return depositsQ.data;
    return depositsQ.data.filter((deposit) => deposit.driverId === selectedDriverFilter);
  }, [depositsQ.data, selectedDriverFilter]);

  const previewAttachments = previewAdvance?.attachments ?? [];
  const driverPreviewAttachments = driverAdvancePreview?.attachments ?? [];
  const activeCustomerAttachmentUrl = customerAttachmentPreviewUrls[previewImageIndex] ?? '';
  const activeCustomerAttachment = previewAttachments[previewImageIndex];
  const activeDriverAttachmentUrl = driverAttachmentPreviewUrls[driverAdvanceImageIndex] ?? '';
  const activeDriverAttachment = driverPreviewAttachments[driverAdvanceImageIndex];
  const isApprovalMode = previewAction !== null;

  if (!isAccountant) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Bạn không có quyền truy cập trang kế toán. Vui lòng đăng nhập bằng tài khoản kế toán hoặc quản trị viên.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <input
        ref={paymentFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePaymentImagesSelect}
      />
      <input
        ref={depositFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleDepositImagesSelect}
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Kế toán thu - nộp</h2>
          <p className="text-sm text-muted-foreground">Theo dõi số tiền tài xế đã thu của khách và nghĩa vụ nộp lại cho công ty</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DatePickerField value={dateFrom} onChange={setDateFrom} placeholder="Từ ngày" allowClear />
          <DatePickerField value={dateTo} onChange={setDateTo} placeholder="Đến ngày" allowClear />
          <Select
            value={selectedDriverFilter || 'all'}
            onValueChange={(value) => setSelectedDriverFilter(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Tất cả tài xế" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tài xế</SelectItem>
              {driversQ.data?.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setDateFrom(currentMonthRange.from);
              setDateTo(currentMonthRange.to);
              setSelectedDriverFilter('');
              setCustomerStatusFilter('all');
              setDriverStatusFilter('all');
            }}
          >
            Xóa lọc
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tài xế đã thu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {summaryQ.data ? summaryQ.data.totalRevenue.toLocaleString('vi-VN') : '...'} ₫
            </div>
            <p className="text-xs text-muted-foreground">Tổng tiền khách trả cho tài xế trong kỳ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Đã nộp về công ty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {summaryQ.data ? summaryQ.data.totalDeposited.toLocaleString('vi-VN') : '...'} ₫
            </div>
            <p className="text-xs text-muted-foreground">Các khoản tài xế đã giao nộp lại</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Công nợ hiện tại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {totalOutstanding.toLocaleString('vi-VN')} ₫
            </div>
            <p className="text-xs text-muted-foreground">Số tiền công ty cần thu thêm từ tài xế</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Chuyến hoàn thành</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">
              {summaryQ.data ? summaryQ.data.completedTrips.toLocaleString('vi-VN') : '...'}
            </div>
            <p className="text-xs text-muted-foreground">Tổng chuyến đã hoàn thành trong kỳ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ứng trước khách chờ nộp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">
              {summaryQ.data ? summaryQ.data.totalCustomerPrepaidPending.toLocaleString('vi-VN') : '...'} ₫
            </div>
            <p className="text-xs text-muted-foreground">Các khoản tổng đài đã thu nhưng chưa bàn giao kế toán</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Đang chờ kế toán xác nhận</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {summaryQ.data ? summaryQ.data.totalCustomerPrepaidSubmitted.toLocaleString('vi-VN') : '...'} ₫
            </div>
            <p className="text-xs text-muted-foreground">Phiếu đã chuyển kế toán nhưng chưa đối soát</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tạm ứng phí tài xế</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              {summaryQ.data ? summaryQ.data.totalDriverAdvanceOutstanding.toLocaleString('vi-VN') : '...'} ₫
            </div>
            <p className="text-xs text-muted-foreground">Khoản ứng phí đã duyệt và chờ khấu trừ</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tổng hợp theo tài xế</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tài xế</TableHead>
                <TableHead className="text-right">Đã thu</TableHead>
                <TableHead className="text-right">Đã nộp</TableHead>
                <TableHead className="text-right">Công nợ</TableHead>
                <TableHead className="text-right">Tạm ứng</TableHead>
                <TableHead className="text-right">Chuyến hoàn thành</TableHead>
                <TableHead className="text-right">Nộp tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverSummaries.map((driver) => {
                const driverAttachments = depositAttachments[driver.driverId] ?? [];
                return (
                  <TableRow key={driver.driverId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{driver.driverName}</span>
                        <span className="text-xs text-muted-foreground">#{driver.driverId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{driver.revenue.toLocaleString('vi-VN')} ₫</TableCell>
                    <TableCell className="text-right">{driver.deposited.toLocaleString('vi-VN')} ₫</TableCell>
                    <TableCell className="text-right font-semibold text-amber-600">{driver.outstanding.toLocaleString('vi-VN')} ₫</TableCell>
                    <TableCell className="text-right text-purple-600">{driver.advanceOutstanding.toLocaleString('vi-VN')} ₫</TableCell>
                    <TableCell className="text-right">{driver.completedTrips}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Input
                          type="number"
                          className="w-32"
                          placeholder="Số tiền"
                          value={depositValues[driver.driverId] ?? ''}
                          onChange={(event) =>
                            setDepositValues((prev) => ({ ...prev, [driver.driverId]: event.target.value }))
                          }
                          min={0}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={depositImagesLoading}
                          onClick={() => {
                            setDepositAttachmentTarget(driver.driverId);
                            depositFileInputRef.current?.click();
                          }}
                        >
                          Ảnh{driverAttachments.length ? ` (${driverAttachments.length})` : ''}
                        </Button>
                        {driverAttachments.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              setDepositAttachments((prev) => {
                                const next = { ...prev };
                                delete next[driver.driverId];
                                return next;
                              })
                            }
                          >
                            Xóa ảnh
                          </Button>
                        )}
                        <Button
                          disabled={depositMut.isPending || depositImagesLoading}
                          onClick={() => {
                            const rawValue = depositValues[driver.driverId];
                            const amount = Number(rawValue || 0);
                            if (!amount || amount <= 0) {
                              toast({ title: 'Lỗi', description: 'Nhập số tiền hợp lệ', variant: 'destructive' });
                              return;
                            }
                            depositMut.mutate({
                              driverId: driver.driverId,
                              amount,
                              note: 'Nộp tiền mặt',
                              attachments: driverAttachments,
                            });
                            setDepositValues((prev) => ({ ...prev, [driver.driverId]: '' }));
                          }}
                        >
                          Nộp
                        </Button>
                      </div>
                      {driverAttachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap justify-end gap-2">
                          {driverAttachments.map((file, idx) => (
                            <Badge key={`${driver.driverId}-${idx}`} variant="outline">
                              {file.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Phiếu ứng trước của khách</CardTitle>
            <p className="text-sm text-muted-foreground">Quản lý các khoản tổng đài viên đã thu hộ khách</p>
          </div>
          <Select
            value={customerStatusFilter}
            onValueChange={(value) => setCustomerStatusFilter(value as 'all' | CustomerAdvanceStatus)}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">{customerStatusLabels.pending}</SelectItem>
              <SelectItem value="submitted">{customerStatusLabels.submitted}</SelectItem>
              <SelectItem value="reconciled">{customerStatusLabels.reconciled}</SelectItem>
              <SelectItem value="rejected">{customerStatusLabels.rejected}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {customerAdvancesQ.isLoading ? (
            <div className="py-6 text-center text-muted-foreground">Đang tải dữ liệu...</div>
          ) : customerAdvances.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">Chưa có phiếu ứng trước nào với bộ lọc hiện tại</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian nhận</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Hình thức</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerAdvances.map((record) => {
                  const actions: Array<{ label: string; status: CustomerAdvanceStatus; variant?: 'outline' | 'default' | 'secondary' | 'destructive' }> = [];
                  if (record.status === 'pending') {
                    actions.push({ label: 'Chuyển kế toán', status: 'submitted', variant: 'secondary' });
                    actions.push({ label: 'Từ chối', status: 'rejected', variant: 'destructive' });
                  } else if (record.status === 'submitted') {
                    actions.push({ label: 'Đã đối soát', status: 'reconciled', variant: 'default' });
                    actions.push({ label: 'Từ chối', status: 'rejected', variant: 'destructive' });
                  }
                  const methodLabel = record.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản';
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{formatDateTime(record.collectedAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{record.customerName}</span>
                          <span className="text-xs text-muted-foreground">{record.customerPhone}</span>
                          {record.tripId && (
                            <span className="text-xs text-muted-foreground">Chuyến #{record.tripId}</span>
                          )}
                          {record.receiptCode && (
                            <span className="text-xs text-muted-foreground">Phiếu: {record.receiptCode}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{record.amount.toLocaleString('vi-VN')} ₫</TableCell>
                      <TableCell>
                        <Badge variant="outline">{methodLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customerStatusVariants[record.status]}>{customerStatusLabels[record.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end flex-wrap gap-2">
                          {record.attachments.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdvancePreview(record)}
                            >
                              Xem ảnh ({record.attachments.length})
                            </Button>
                          )}
                          {actions.map((action) => (
                            <Button
                              key={action.label}
                              size="sm"
                              variant={action.variant ?? 'outline'}
                              disabled={customerAdvanceStatusMut.isPending}
                              onClick={() => handleCustomerAdvanceStatus(record, action.status)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                        {record.note && (
                          <p className="mt-2 text-xs text-muted-foreground text-right">{record.note}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ĐÃ BỎ phần danh sách tạm ứng phí tài xế khỏi trang Accounting, chỉ giữ lại KPI tổng quan ở phía trên */}

      <Card>
        <CardHeader>
          <CardTitle>Ghi nhận thu tiền từ tài xế</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">ID chuyến *</label>
              <Input
                value={paymentForm.tripId}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, tripId: event.target.value }))}
                placeholder="Ví dụ: 12"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Tài xế *</label>
              <Select
                value={paymentForm.driverId || undefined}
                onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, driverId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tài xế" />
                </SelectTrigger>
                <SelectContent>
                  {driversQ.data?.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
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
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="Ví dụ: 150000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Hình thức</label>
              <Select
                value={paymentForm.method}
                onValueChange={(value: 'cash' | 'transfer') =>
                  setPaymentForm((prev) => ({ ...prev, method: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tiền mặt</SelectItem>
                  <SelectItem value="transfer">Chuyển khoản</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={paymentMut.isPending || paymentImagesLoading}
                onClick={() => {
                  const amount = Number(paymentForm.amount || 0);
                  if (!paymentForm.tripId || !paymentForm.driverId || !amount || amount <= 0) {
                    toast({ title: 'Thiếu thông tin', description: 'Điền đủ ID chuyến, tài xế và số tiền hợp lệ', variant: 'destructive' });
                    return;
                  }
                  paymentMut.mutate({
                    tripId: paymentForm.tripId,
                    driverId: paymentForm.driverId,
                    amount,
                    method: paymentForm.method,
                    attachments: paymentImages,
                  });
                  setPaymentForm({ tripId: '', driverId: '', amount: '', method: 'cash' });
                }}
              >
                Ghi nhận
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                disabled={paymentImagesLoading}
                onClick={() => paymentFileInputRef.current?.click()}
              >
                {paymentImages.length ? `Thay ảnh (${paymentImages.length}/${MAX_VOUCHER_IMAGES})` : 'Đính kèm ảnh (tối đa 3)'}
              </Button>
              {paymentImages.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setPaymentImages([])}>
                  Xóa ảnh
                </Button>
              )}
              {paymentImagesLoading && (
                <span className="text-xs text-muted-foreground">Đang xử lý ảnh...</span>
              )}
            </div>
            {paymentImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {paymentImages.map((file, idx) => (
                  <Badge key={`payment-image-${idx}`} variant="outline">
                    {file.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="text-sm font-medium mb-2">Thanh toán gần đây</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Chuyến</TableHead>
                <TableHead>Tài xế</TableHead>
                <TableHead>Hình thức</TableHead>
                <TableHead>Chứng từ</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const driver = driversQ.data?.find((d) => d.id === payment.driverId);
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDateTime(payment.collectedAt)}</TableCell>
                    <TableCell>#{payment.tripId}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <span>{driver?.name || payment.driverId}</span>
                      <Badge variant="outline">{payment.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</Badge>
                    </TableCell>
                    <TableCell>{payment.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</TableCell>
                    <TableCell>
                      {payment.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {payment.attachments.map((attachment) => (
                            <Button
                              key={attachment.id}
                              variant="link"
                              size="sm"
                              onClick={() => openAttachment(attachment)}
                            >
                              {attachment.fileName}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Không có</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{payment.amount.toLocaleString('vi-VN')} ₫</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử nộp tiền</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Tài xế</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Chứng từ</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeposits.map((deposit) => {
                const driver = driversQ.data?.find((d) => d.id === deposit.driverId);
                return (
                  <TableRow key={deposit.id}>
                    <TableCell>{formatDateTime(deposit.createdAt)}</TableCell>
                    <TableCell>{driver?.name || deposit.driverId}</TableCell>
                    <TableCell className="text-right">{deposit.amount.toLocaleString('vi-VN')} ₫</TableCell>
                    <TableCell>
                      {deposit.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {deposit.attachments.map((attachment, idx) => (
                            <Button
                              key={attachment.id || idx}
                              variant="outline"
                              size="sm"
                              onClick={() => openAttachment(attachment)}
                            >
                              Xem ảnh {deposit.attachments.length > 1 ? `(${idx + 1})` : ''}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Không có</span>
                      )}
                    </TableCell>
                    <TableCell>{deposit.note || ''}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!previewAdvance}
        onOpenChange={(open) => {
          if (!open && !customerAdvanceStatusMut.isPending) {
            closeAdvancePreview();
            setActivePreviewTab('customer');
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Đối soát chứng từ</DialogTitle>
          </DialogHeader>
          <Tabs
            value={activePreviewTab}
            defaultValue="customer"
            onValueChange={(value) => {
              if (value === 'customer' && previewAdvance) {
                setActivePreviewTab('customer');
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="customer" disabled={!previewAdvance}>Ứng trước khách</TabsTrigger>
            </TabsList>
            <TabsContent value="customer">
              {previewAdvance && (
                <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
                  <div className="space-y-4">
                    {previewAttachments.length > 0 ? (
                      <>
                        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted">
                          {activeCustomerAttachmentUrl ? (
                            <img
                              src={activeCustomerAttachmentUrl}
                              alt={activeCustomerAttachment?.fileName ?? 'attachment'}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">Không thể tải ảnh</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {previewAttachments.map((attachment, index) => {
                            const previewUrl = customerAttachmentPreviewUrls[index] ?? '';
                            const isActive = index === previewImageIndex;
                            return (
                              <button
                                key={attachment.id}
                                type="button"
                                onClick={() => setPreviewImageIndex(index)}
                                className={`h-16 w-16 overflow-hidden rounded border ${isActive ? 'ring-2 ring-primary ring-offset-2' : 'opacity-80 hover:opacity-100'
                                  }`}
                              >
                                {previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt={attachment.fileName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center px-1 text-[10px] text-muted-foreground">
                                    Xem ảnh
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {activeCustomerAttachment && (
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAttachment(activeCustomerAttachment)}
                            >
                              Mở file gốc
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                        Không có chứng từ đính kèm
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Khách hàng</p>
                      <p className="font-medium text-gray-900">{previewAdvance.customerName}</p>
                      <p className="text-muted-foreground">{previewAdvance.customerPhone}</p>
                    </div>
                    {previewAdvance.tripId && (
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Chuyến liên quan</p>
                        <p className="font-medium">#{previewAdvance.tripId}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Số tiền</p>
                        <p className="font-semibold text-gray-900">{previewAdvance.amount.toLocaleString('vi-VN')} ₫</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Hình thức</p>
                        <p className="font-medium">{previewAdvance.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Trạng thái hiện tại</p>
                        <Badge variant={customerStatusVariants[previewAdvance.status]}>
                          {customerStatusLabels[previewAdvance.status]}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Ngày nhận</p>
                        <p>{formatDateTime(previewAdvance.collectedAt)}</p>
                      </div>
                      {previewAdvance.receiptCode && (
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Mã phiếu/biên lai</p>
                          <p className="font-medium">{previewAdvance.receiptCode}</p>
                        </div>
                      )}
                    </div>
                    {previewAdvance.note && (
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Ghi chú hiện tại</p>
                        <p>{previewAdvance.note}</p>
                      </div>
                    )}
                    {isApprovalMode && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">
                          {previewAction === 'rejected' ? 'Lý do từ chối *' : 'Ghi chú phê duyệt (tuỳ chọn)'}
                        </p>
                        <Textarea
                          value={approvalNote}
                          onChange={(event) => setApprovalNote(event.target.value)}
                          placeholder={previewAction === 'rejected' ? 'Nhập lý do từ chối phiếu' : 'Thêm ghi chú cho phiếu'}
                          rows={4}
                          disabled={customerAdvanceStatusMut.isPending}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={closeAdvancePreview}
                  disabled={customerAdvanceStatusMut.isPending}
                >
                  Đóng
                </Button>
                {isApprovalMode && (
                  <Button
                    onClick={submitAdvanceApproval}
                    disabled={customerAdvanceStatusMut.isPending}
                  >
                    {previewAction === 'rejected'
                      ? 'Xác nhận từ chối'
                      : previewAction === 'reconciled'
                        ? 'Xác nhận đã đối soát'
                        : 'Chuyển kế toán'}
                  </Button>
                )}
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounting;

