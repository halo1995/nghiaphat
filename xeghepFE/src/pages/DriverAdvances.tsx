import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverExpenseAdvances, type DriverExpenseStatus, type DriverExpenseType } from '@/data/accounting';
import { Calendar, RotateCcw } from 'lucide-react';

const driverStatusLabels: Record<DriverExpenseStatus, string> = {
  requested: 'Chờ duyệt',
  approved: 'Đã duyệt',
  transferred: 'Đã chuyển tiền',
  deducted: 'Đã khấu trừ',
  rejected: 'Từ chối',
};

const driverStatusVariants: Record<DriverExpenseStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  requested: 'outline',
  approved: 'secondary',
  transferred: 'default',
  deducted: 'default',
  rejected: 'destructive',
};

const driverExpenseLabels: Record<DriverExpenseType, string> = {
  toll: 'Phí cầu đường',
  parking: 'Phí bến bãi',
  fuel: 'Nhiên liệu',
  other: 'Khác',
};

const DriverAdvances: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const driverId = user?.id ? user.id.toString() : '';

  // Mặc định lấy 30 ngày gần đây
  const getDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0],
    };
  };

  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState<string>(defaultRange.from);
  const [dateTo, setDateTo] = useState<string>(defaultRange.to);

  const dateFromObj = useMemo(() => (dateFrom ? new Date(dateFrom) : undefined), [dateFrom]);
  const dateToObj = useMemo(() => (dateTo ? new Date(dateTo) : undefined), [dateTo]);

  const {
    data: driverAdvances = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['driver-expense-advances', driverId, dateFrom, dateTo],
    queryFn: () =>
      getDriverExpenseAdvances({
        driverId,
        from: dateFromObj,
        to: dateToObj,
      }),
    enabled: isAuthenticated && !authLoading && !!driverId,
  });

  const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

  const stats = useMemo(() => {
    const requested = driverAdvances.filter((a) => a.status === 'requested');
    const approved = driverAdvances.filter((a) => a.status === 'approved');
    const transferred = driverAdvances.filter((a) => a.status === 'transferred');
    const deducted = driverAdvances.filter((a) => a.status === 'deducted');

    return {
      total: driverAdvances.length,
      totalAmount: driverAdvances.reduce((sum, a) => sum + a.amount, 0),
      requested: {
        count: requested.length,
        amount: requested.reduce((sum, a) => sum + a.amount, 0),
      },
      approved: {
        count: approved.length,
        amount: approved.reduce((sum, a) => sum + a.amount, 0),
      },
      transferred: {
        count: transferred.length,
        amount: transferred.reduce((sum, a) => sum + a.amount, 0),
      },
      deducted: {
        count: deducted.length,
        amount: deducted.reduce((sum, a) => sum + a.amount, 0),
      },
    };
  }, [driverAdvances]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Vui lòng đăng nhập để xem lịch sử tạm ứng.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-3 border-b bg-white px-4 py-3 shadow-sm md:gap-4 md:px-6 md:py-4">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Lịch Sử Tạm Ứng</h1>
          <p className="text-xs text-muted-foreground md:text-sm">Theo dõi trạng thái phê duyệt và khấu trừ</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 px-3 py-4 md:p-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Tổng yêu cầu</p>
                <p className="text-2xl font-bold text-blue-600 md:text-3xl">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Chờ duyệt</p>
                <p className="text-2xl font-bold text-amber-600 md:text-3xl">{stats.requested.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats.requested.amount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Đã duyệt</p>
                <p className="text-2xl font-bold text-green-600 md:text-3xl">{stats.approved.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats.approved.amount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Đã khấu trừ</p>
                <p className="text-2xl font-bold text-gray-600 md:text-3xl">{stats.deducted.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats.deducted.amount)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Date Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-gray-600" size={20} />
                    <DatePickerField value={dateFrom} onChange={setDateFrom} placeholder="Từ ngày" allowClear />
                  </div>
                  <DatePickerField value={dateTo} onChange={setDateTo} placeholder="Đến ngày" allowClear />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const range = getDefaultDateRange();
                      setDateFrom(range.from);
                      setDateTo(range.to);
                    }}
                  >
                    30 ngày gần đây
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Hiển thị {driverAdvances.length} yêu cầu
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="gap-2"
                  >
                    <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    Tải lại
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advances List */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">Đang tải danh sách tạm ứng...</div>
              ) : driverAdvances.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Bạn chưa có yêu cầu tạm ứng nào trong khoảng thời gian này
                </div>
              ) : (
                <>
                  {/* Mobile: card list */}
                  <div className="space-y-3 px-4 py-4 md:hidden">
                    {driverAdvances.map((advance) => (
                      <div key={advance.id} className="rounded-lg border bg-white p-3 text-sm shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{driverExpenseLabels[advance.expenseType]}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(advance.requestedAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <Badge variant={driverStatusVariants[advance.status]}>
                            {driverStatusLabels[advance.status]}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Số tiền</span>
                          <span className="text-base font-semibold text-gray-900">{formatCurrency(advance.amount)}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {advance.tripId && <p className="text-xs text-muted-foreground">Chuyến #{advance.tripId}</p>}
                          {advance.note && <p className="text-xs text-gray-700">Ghi chú: {advance.note}</p>}
                          {advance.rejectionReason && (
                            <p className="text-xs text-destructive">Lý do từ chối: {advance.rejectionReason}</p>
                          )}
                          {advance.attachments.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {advance.attachments.map((attachment) => (
                                <Button
                                  key={attachment.id}
                                  variant="link"
                                  size="sm"
                                  className="h-6 px-0 text-xs"
                                  asChild
                                >
                                  <a href={attachment.downloadUrl} target="_blank" rel="noopener noreferrer">
                                    {attachment.fileName}
                                  </a>
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium text-muted-foreground">Thời gian</th>
                          <th className="px-6 py-3 font-medium text-muted-foreground">Loại phí</th>
                          <th className="px-6 py-3 font-medium text-muted-foreground text-right">Số tiền</th>
                          <th className="px-6 py-3 font-medium text-muted-foreground">Trạng thái</th>
                          <th className="px-6 py-3 font-medium text-muted-foreground">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driverAdvances.map((advance) => (
                          <tr key={advance.id} className="border-t">
                            <td className="px-6 py-3">{new Date(advance.requestedAt).toLocaleString('vi-VN')}</td>
                            <td className="px-6 py-3">{driverExpenseLabels[advance.expenseType]}</td>
                            <td className="px-6 py-3 text-right font-medium text-gray-900">
                              {formatCurrency(advance.amount)}
                            </td>
                            <td className="px-6 py-3">
                              <Badge variant={driverStatusVariants[advance.status]}>
                                {driverStatusLabels[advance.status]}
                              </Badge>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-col gap-1">
                                {advance.note && <span>{advance.note}</span>}
                                {advance.rejectionReason && (
                                  <span className="text-xs text-destructive">
                                    Lý do từ chối: {advance.rejectionReason}
                                  </span>
                                )}
                                {advance.tripId && (
                                  <span className="text-xs text-muted-foreground">Chuyến #{advance.tripId}</span>
                                )}
                                {advance.attachments.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    {advance.attachments.map((attachment) => (
                                      <Button
                                        key={attachment.id}
                                        variant="link"
                                        size="sm"
                                        className="justify-start px-0"
                                        asChild
                                      >
                                        <a href={attachment.downloadUrl} target="_blank" rel="noopener noreferrer">
                                          {attachment.fileName}
                                        </a>
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DriverAdvances;
