import React, { useMemo, useRef, useState } from 'react';
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
import type { CustomerAdvanceStatus, DriverExpenseStatus, DriverExpenseType } from '@/data/accounting';
import { compressImages, MAX_VOUCHER_IMAGES } from '@/utils/imageCompression';

const Accounting: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | CustomerAdvanceStatus>('pending');
  const [driverStatusFilter, setDriverStatusFilter] = useState<'all' | DriverExpenseStatus>('requested');
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
    deducted: 'Đã khấu trừ',
    rejected: 'Từ chối',
  };

  const driverStatusVariants: Record<DriverExpenseStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
    requested: 'outline',
    approved: 'secondary',
    deducted: 'default',
    rejected: 'destructive',
  };

  const driverExpenseLabels: Record<DriverExpenseType, string> = {
    toll: 'Phí cầu đường',
    parking: 'Phí bến bãi',
    fuel: 'Nhiên liệu',
    other: 'Khác',
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

  const handleCustomerAdvanceStatus = (id: string, status: CustomerAdvanceStatus) => {
    if (!user?.id) {
      toast({ title: 'Thiếu quyền', description: 'Vui lòng đăng nhập lại', variant: 'destructive' });
      return;
    }
    let note: string | undefined;
    if (status === 'rejected') {
      const reason = typeof window !== 'undefined'
        ? window.prompt('Nhập lý do từ chối phiếu ứng trước')?.trim()
        : '';
      if (!reason) {
        toast({ title: 'Đã hủy thao tác', description: 'Cần nhập lý do để từ chối phiếu', variant: 'destructive' });
        return;
      }
      note = reason;
    }
    customerAdvanceStatusMut.mutate({ id, status, actionUserId: user.id.toString(), note });
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

  const customerAdvances = customerAdvancesQ.data ?? [];
  const driverAdvances = driverAdvancesQ.data ?? [];

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
              setDateFrom('');
              setDateTo('');
              setSelectedDriverFilter('');
              setCustomerStatusFilter('pending');
              setDriverStatusFilter('requested');
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
                      <TableCell>{new Date(record.collectedAt).toLocaleString('vi-VN')}</TableCell>
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
                        <div className="flex justify-end gap-2">
                          {actions.map((action) => (
                            <Button
                              key={action.label}
                              size="sm"
                              variant={action.variant ?? 'outline'}
                              disabled={customerAdvanceStatusMut.isPending}
                              onClick={() => handleCustomerAdvanceStatus(record.id, action.status)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                        {record.note && (
                          <p className="mt-2 text-xs text-muted-foreground">{record.note}</p>
                        )}
                        {record.attachments.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1 items-end">
                            {record.attachments.map((attachment) => (
                              <Button key={attachment.id} variant="link" size="sm" asChild>
                                <a href={attachment.downloadUrl} target="_blank" rel="noopener noreferrer">
                                  {attachment.fileName}
                                </a>
                              </Button>
                            ))}
                          </div>
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

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Tạm ứng phí tài xế</CardTitle>
            <p className="text-sm text-muted-foreground">Theo dõi và duyệt các khoản ứng phí cho tài xế</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={driverStatusFilter}
              onValueChange={(value) => setDriverStatusFilter(value as 'all' | DriverExpenseStatus)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="requested">{driverStatusLabels.requested}</SelectItem>
                <SelectItem value="approved">{driverStatusLabels.approved}</SelectItem>
                <SelectItem value="deducted">{driverStatusLabels.deducted}</SelectItem>
                <SelectItem value="rejected">{driverStatusLabels.rejected}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {driverAdvancesQ.isLoading ? (
            <div className="py-6 text-center text-muted-foreground">Đang tải dữ liệu...</div>
          ) : driverAdvances.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">Chưa có tạm ứng nào với bộ lọc hiện tại</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Tài xế</TableHead>
                  <TableHead>Loại phí</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driverAdvances.map((advance) => {
                  const driver = driversQ.data?.find((d) => d.id === advance.driverId);
                  const actions: Array<{ label: string; status: DriverExpenseStatus; variant?: 'outline' | 'default' | 'secondary' | 'destructive' }> = [];
                  if (advance.status === 'requested') {
                    actions.push({ label: 'Duyệt', status: 'approved', variant: 'secondary' });
                    actions.push({ label: 'Từ chối', status: 'rejected', variant: 'destructive' });
                  } else if (advance.status === 'approved') {
                    actions.push({ label: 'Đã khấu trừ', status: 'deducted', variant: 'default' });
                    actions.push({ label: 'Từ chối', status: 'rejected', variant: 'destructive' });
                  }
                  return (
                    <TableRow key={advance.id}>
                      <TableCell>{new Date(advance.requestedAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{driver?.name || `#${advance.driverId}`}</span>
                          {advance.tripId && (
                            <span className="text-xs text-muted-foreground">Chuyến #{advance.tripId}</span>
                          )}
                          {advance.requestedBy && (
                            <span className="text-xs text-muted-foreground">Tổng đài viên #{advance.requestedBy}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{driverExpenseLabels[advance.expenseType]}</TableCell>
                      <TableCell className="text-right font-medium">{advance.amount.toLocaleString('vi-VN')} ₫</TableCell>
                      <TableCell>
                        <Badge variant={driverStatusVariants[advance.status]}>{driverStatusLabels[advance.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {actions.map((action) => (
                            <Button
                              key={action.label}
                              size="sm"
                              variant={action.variant ?? 'outline'}
                              disabled={driverAdvanceStatusMut.isPending}
                              onClick={() => handleDriverAdvanceStatus(advance.id, action.status)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                        {advance.note && (
                          <p className="mt-2 text-xs text-muted-foreground">{advance.note}</p>
                        )}
                        {advance.rejectionReason && (
                          <p className="mt-1 text-xs text-destructive">Lý do: {advance.rejectionReason}</p>
                        )}
                        {advance.attachments.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1 items-end">
                            {advance.attachments.map((attachment) => (
                              <Button key={attachment.id} variant="link" size="sm" asChild>
                                <a href={attachment.downloadUrl} target="_blank" rel="noopener noreferrer">
                                  {attachment.fileName}
                                </a>
                              </Button>
                            ))}
                          </div>
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
                    <TableCell>{new Date(payment.collectedAt).toLocaleString('vi-VN')}</TableCell>
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
                            <Button key={attachment.id} variant="link" size="sm" asChild>
                              <a href={attachment.downloadUrl} target="_blank" rel="noopener noreferrer">
                                {attachment.fileName}
                              </a>
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
                    <TableCell>{new Date(deposit.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{driver?.name || deposit.driverId}</TableCell>
                    <TableCell className="text-right">{deposit.amount.toLocaleString('vi-VN')} ₫</TableCell>
                    <TableCell>
                      {deposit.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {deposit.attachments.map((attachment) => (
                            <Button key={attachment.id} variant="link" size="sm" asChild>
                              <a href={attachment.downloadUrl} target="_blank" rel="noopener noreferrer">
                                {attachment.fileName}
                              </a>
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
    </div>
  );
};

export default Accounting;
