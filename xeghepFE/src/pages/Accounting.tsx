import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CustomerAdvancePayment,
  CustomerAdvanceStatus,
  DriverExpenseStatus,
  PaymentAttachment,
  getRevenueSummary,
  getDeposits,
  getPayments,
  getCustomerAdvances,
  getDriverExpenseAdvances,
  createDeposit,
  recordTripPayment,
  updateCustomerAdvanceStatus,
  updateDriverExpenseAdvanceStatus,
} from '@/data/accounting';
import { getDrivers } from '@/data/drivers';

// Components
import { AccountingSummary } from './accounting/components/AccountingSummary';
import { DriverSummaryTable } from './accounting/components/DriverSummaryTable';
import { CustomerAdvancesTable } from './accounting/components/CustomerAdvancesTable';
import { PaymentRecordingForm } from './accounting/components/PaymentRecordingForm';
import { PaymentHistoryTable } from './accounting/components/PaymentHistoryTable';
import { DepositHistoryTable } from './accounting/components/DepositHistoryTable';
import { AdvancePreviewDialog } from './accounting/components/AdvancePreviewDialog';

const getCurrentDate = () => {
  const now = new Date();
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return format(now);
};

const getMonthRange = (year: number, month: number) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: lastDay.toISOString().slice(0, 10),
  };
};

const Accounting: React.FC = () => {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const isAccountant = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const currentDate = useMemo(() => getCurrentDate(), []);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // State for summary filter (monthly)
  const [summaryYear, setSummaryYear] = useState<number>(currentYear);
  const [summaryMonth, setSummaryMonth] = useState<number>(currentMonth);

  // State for tab filters (daily)
  const [dateFrom, setDateFrom] = useState<string>(() => currentDate);
  const [dateTo, setDateTo] = useState<string>(() => currentDate);
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('all');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | CustomerAdvanceStatus>('all');
  const [driverStatusFilter, setDriverStatusFilter] = useState<'all' | DriverExpenseStatus>('all');

  const [previewAdvance, setPreviewAdvance] = useState<CustomerAdvancePayment | null>(null);
  const [previewAction, setPreviewAction] = useState<CustomerAdvanceStatus | null>(null);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<'driver-summary' | 'customer-advances'>('driver-summary');

  // Date objects for tab filters
  const dateFromObj = useMemo(() => (dateFrom ? new Date(dateFrom) : undefined), [dateFrom]);
  const dateToObj = useMemo(() => (dateTo ? new Date(dateTo) : undefined), [dateTo]);

  // Date objects for summary filter
  const summaryDateRange = useMemo(() => getMonthRange(summaryYear, summaryMonth), [summaryYear, summaryMonth]);
  const summaryDateFromObj = useMemo(() => new Date(summaryDateRange.from), [summaryDateRange.from]);
  const summaryDateToObj = useMemo(() => new Date(summaryDateRange.to), [summaryDateRange.to]);

  // Query client for mutations
  const qc = useQueryClient();

  // Data queries
  const enabled = isAuthenticated && isAccountant;

  const driversQ = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
    enabled,
  });

  const summaryQ = useQuery({
    queryKey: ['revenue-summary', summaryDateFromObj, summaryDateToObj],
    queryFn: () => getRevenueSummary(summaryDateFromObj, summaryDateToObj),
    enabled,
  });

  const depositsQ = useQuery({
    queryKey: ['deposits'],
    queryFn: getDeposits,
    enabled,
  });

  const paymentsQ = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
    enabled,
  });

  const customerAdvancesQ = useQuery({
    queryKey: ['customer-advances', customerStatusFilter],
    queryFn: () =>
      getCustomerAdvances(
        customerStatusFilter === 'all' ? undefined : { status: customerStatusFilter },
      ),
    enabled,
  });

  // Client-side date filtering helper
  const isWithinDateRange = useCallback((dateStr: string, from?: Date, to?: Date): boolean => {
    if (!from && !to) return true;
    const date = new Date(dateStr);
    if (from && date < from) return false;
    if (to) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      if (date > endOfDay) return false;
    }
    return true;
  }, []);

  // Filter data by date range
  const drivers = driversQ.data || [];
  const summary = summaryQ.data;
  const deposits = useMemo(
    () => depositsQ.data?.filter(deposit => isWithinDateRange(deposit.createdAt, dateFromObj, dateToObj)) || [],
    [depositsQ.data, dateFromObj, dateToObj, isWithinDateRange]
  );
  const payments = useMemo(
    () => paymentsQ.data?.filter(payment => isWithinDateRange(payment.collectedAt, dateFromObj, dateToObj)) || [],
    [paymentsQ.data, dateFromObj, dateToObj, isWithinDateRange]
  );
  const customerAdvances = useMemo(
    () => customerAdvancesQ.data?.filter(advance => isWithinDateRange(advance.collectedAt, dateFromObj, dateToObj)) || [],
    [customerAdvancesQ.data, dateFromObj, dateToObj, isWithinDateRange]
  );
  const isLoading = driversQ.isLoading || summaryQ.isLoading || depositsQ.isLoading || paymentsQ.isLoading || customerAdvancesQ.isLoading;

  // Mutations
  const depositMut = useMutation({
    mutationFn: createDeposit,
    onSuccess: () => {
      toast({ title: 'Đã nộp tiền', description: 'Cập nhật công nợ tài xế thành công' });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['revenue-summary'] });
      qc.invalidateQueries({ queryKey: ['deposits'] });
    },
    onError: (e: unknown) => {
      toast({
        title: 'Lỗi',
        description: (e instanceof Error ? e.message : String(e)) || 'Không thể nộp tiền',
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

  // Handlers
  const handleDeposit = (data: {
    driverId: string;
    amount: number;
    note: string;
    attachments: File[];
  }) => {
    depositMut.mutate(data);
  };

  const handlePaymentDeposit = (data: {
    driverId: string;
    amount: number;
    note: string;
    attachments: File[];
  }) => {
    depositMut.mutate(data);
  };

  const handleCustomerAction = (
    record: CustomerAdvancePayment,
    status: CustomerAdvanceStatus
  ) => {
    if (!user?.id) {
      toast({ title: 'Thiếu quyền', description: 'Vui lòng đăng nhập lại', variant: 'destructive' });
      return;
    }
    setPreviewAdvance(record);
    setPreviewAction(status);
  };

  const handlePreview = (record: CustomerAdvancePayment) => {
    setPreviewAdvance(record);
    setPreviewAction(null);
  };

  const handleConfirmAction = (
    id: string,
    status: CustomerAdvanceStatus,
    note?: string
  ) => {
    if (!user?.id) return;
    if (status === 'rejected' && !note) {
      toast({ title: 'Thiếu lý do', description: 'Vui lòng nhập ghi chú khi từ chối phiếu', variant: 'destructive' });
      return;
    }
    customerAdvanceStatusMut.mutate(
      {
        id,
        status,
        actionUserId: user.id.toString(),
        note,
      },
      {
        onSuccess: () => {
          setPreviewAdvance(null);
          setPreviewAction(null);
        },
      }
    );
  };

  const openAttachment = useCallback(async (attachment: PaymentAttachment) => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(attachment.downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Không thể tải file');
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

  const driverSummaries = summary?.byDriver ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Kế toán thu - nộp</h2>
          <p className="text-sm text-muted-foreground">
            Theo dõi số tiền tài xế đã thu của khách và nghĩa vụ nộp lại cho công ty
          </p>
        </div>
      </div>

      {/* Summary Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Tổng hợp theo tháng:</span>
              <Select
                value={summaryMonth.toString()}
                onValueChange={(value) => setSummaryMonth(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      Tháng {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={summaryYear.toString()}
                onValueChange={(value) => setSummaryYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      Năm {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSummaryYear(currentYear);
                setSummaryMonth(currentMonth);
              }}
            >
              Tháng hiện tại
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <AccountingSummary data={summary} />

      {/* Tabs */}
      <div className="space-y-6">
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            console.log('Tab changed to:', value);
            setActiveTab(value as 'driver-summary' | 'customer-advances');
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="driver-summary">Tổng hợp tài xế</TabsTrigger>
            <TabsTrigger value="customer-advances">Ứng trước khách hàng</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Driver Summary Tab */}
        {activeTab === 'driver-summary' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <DatePickerField value={dateFrom} onChange={setDateFrom} placeholder="Từ ngày" allowClear />
            <DatePickerField value={dateTo} onChange={setDateTo} placeholder="Đến ngày" allowClear />
            <Select
              value={selectedDriverFilter}
              onValueChange={setSelectedDriverFilter}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tất cả tài xế" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tài xế</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setDateFrom(currentDate);
                setDateTo(currentDate);
                setSelectedDriverFilter('all');
              }}
            >
              Xóa lọc
            </Button>
          </div>
          {/* Driver Summary Table */}
          <DriverSummaryTable
            data={driverSummaries}
            onDeposit={handleDeposit}
            isSubmitting={depositMut.isPending}
          />

          {/* Payment Recording Form & History */}
          <PaymentRecordingForm
            drivers={drivers}
            onSubmit={handlePaymentDeposit}
            isSubmitting={depositMut.isPending}
          />

          <Card>
            <CardContent className="pt-6">
              <PaymentHistoryTable
                data={payments}
                drivers={drivers}
                selectedDriverFilter={selectedDriverFilter}
                onOpenAttachment={openAttachment}
              />
            </CardContent>
          </Card>

          {/* Deposit History */}
          <DepositHistoryTable
            data={deposits}
            drivers={drivers}
            selectedDriverFilter={selectedDriverFilter}
            onOpenAttachment={openAttachment}
          />
        </div>
        )}

        {/* Customer Advances Tab */}
        {activeTab === 'customer-advances' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <DatePickerField value={dateFrom} onChange={setDateFrom} placeholder="Từ ngày" allowClear />
            <DatePickerField value={dateTo} onChange={setDateTo} placeholder="Đến ngày" allowClear />
            <Button
              variant="outline"
              onClick={() => {
                setDateFrom(currentDate);
                setDateTo(currentDate);
                setCustomerStatusFilter('all');
              }}
            >
              Xóa lọc
            </Button>
          </div>
          {/* Customer Advances Table */}
          <CustomerAdvancesTable
            data={customerAdvances}
            filter={customerStatusFilter}
            onFilterChange={setCustomerStatusFilter}
            onAction={handleCustomerAction}
            onPreview={handlePreview}
            isLoading={isLoading}
            isSubmitting={customerAdvanceStatusMut.isPending}
          />
        </div>
        )}
      </div>

      {/* Dialogs */}
      <AdvancePreviewDialog
        data={previewAdvance}
        action={previewAction}
        isOpen={!!previewAdvance}
        onClose={() => {
          setPreviewAdvance(null);
          setPreviewAction(null);
        }}
        onConfirmAction={handleConfirmAction}
        isSubmitting={customerAdvanceStatusMut.isPending}
        onOpenAttachment={openAttachment}
      />
    </div>
  );
};

export default Accounting;
