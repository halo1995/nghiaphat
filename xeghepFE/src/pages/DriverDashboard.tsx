import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTrips, type Trip } from '@/data/trips';
import { getDriver } from '@/data/drivers';
import { Calendar, MapPin, Users, Clock, ArrowRight, CheckCircle, Wallet, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createDriverExpenseAdvance, getDriverExpenseAdvances, type DriverExpenseType, type DriverExpenseStatus } from '@/data/accounting';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compressImages, MAX_VOUCHER_IMAGES } from '@/utils/imageCompression';

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

const getCurrentLocalDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DriverDashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(getCurrentLocalDate);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Đã phân xe' | 'Đang đón' | 'Đang đi' | 'Hoàn thành'>('all');
  const [driverAdvanceForm, setDriverAdvanceForm] = useState({
    amount: '',
    expenseType: 'toll' as DriverExpenseType,
    tripId: '',
    note: '',
  });
  const [driverAdvanceImages, setDriverAdvanceImages] = useState<File[]>([]);
  const driverAdvanceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [driverAdvanceImagesLoading, setDriverAdvanceImagesLoading] = useState(false);
  const [selectedAdvanceTrip, setSelectedAdvanceTrip] = useState<Trip | null>(null);
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const driverId = user?.id ? user.id.toString() : '';

  const {
    data: allTrips = [],
    isLoading,
    isFetching: isTripsFetching,
    refetch: refetchTrips,
  } = useQuery({
    queryKey: ['trips', selectedDate],
    queryFn: () => getTrips(selectedDate),
    enabled: isAuthenticated && !authLoading,
  });

  // Query driver advances for summary stats only
  const {
    data: driverAdvancesData = [],
  } = useQuery({
    queryKey: ['driver-expense-advances-summary', driverId],
    queryFn: () => getDriverExpenseAdvances({ driverId }),
    enabled: isAuthenticated && !authLoading && !!driverId,
  });

  const { data: driverInfo } = useQuery({
    queryKey: ['driver-info', driverId],
    queryFn: () => getDriver(Number(driverId)),
    enabled: isAuthenticated && !authLoading && !!driverId,
  });

  const walletBalance = driverInfo?.outstandingBalance || 0;

  const driverAdvanceMutation = useMutation({
    mutationFn: createDriverExpenseAdvance,
    onSuccess: () => {
      toast({ title: 'Đã gửi yêu cầu', description: 'Tạm ứng phí sẽ được kế toán xem xét' });
      setDriverAdvanceForm({ amount: '', expenseType: 'toll', tripId: '', note: '' });
      setDriverAdvanceImages([]);
      setSelectedAdvanceTrip(null);
      if (driverAdvanceFileInputRef.current) {
        driverAdvanceFileInputRef.current.value = '';
      }
      setFinanceDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['driver-expense-advances', driverId] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Không thể gửi yêu cầu',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    },
  });
  const openAdvanceDialogForTrip = (trip: Trip) => {
    setDriverAdvanceImages([]);
    if (driverAdvanceFileInputRef.current) {
      driverAdvanceFileInputRef.current.value = '';
    }
    setDriverAdvanceForm((prev) => ({
      ...prev,
      tripId: trip.id.toString(),
    }));
    setSelectedAdvanceTrip(trip);
    setFinanceDialogOpen(true);
  };

  // Filter trips for this driver
  const myTrips = allTrips.filter(trip =>
    driverId && trip.driverId === driverId &&
    trip.status !== 'Đã hủy' &&
    trip.pickupTime.startsWith(selectedDate)
  );

  const filteredTrips = statusFilter === 'all'
    ? myTrips
    : myTrips.filter(trip => trip.status === statusFilter);

  // Sort by pickup time
  const sortedTrips = [...filteredTrips].sort((a, b) =>
    new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime()
  );

  const stats = {
    total: myTrips.length,
    completed: myTrips.filter(t => t.status === 'Hoàn thành').length,
    inProgress: myTrips.filter(t => t.status === 'Đang đi' || t.status === 'Đang đón').length,
    upcoming: myTrips.filter(t => t.status === 'Đã phân xe').length,
  };

  const driverAdvances = driverAdvancesData ?? [];
  const outstandingAdvance = useMemo(
    () => driverAdvances
      .filter((advance) => advance.status === 'approved')
      .reduce((sum, advance) => sum + advance.amount, 0),
    [driverAdvances],
  );
  const pendingAdvance = useMemo(
    () => driverAdvances
      .filter((advance) => advance.status === 'requested')
      .reduce((sum, advance) => sum + advance.amount, 0),
    [driverAdvances],
  );

  const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

  const handleDriverAdvanceImagesSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    setDriverAdvanceImagesLoading(true);
    try {
      const compressed = await compressImages(files);
      setDriverAdvanceImages(compressed);
    } catch (error) {
      toast({
        title: 'Không thể xử lý ảnh',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    } finally {
      setDriverAdvanceImagesLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    'Đã phân xe': 'bg-blue-100 text-blue-700 border-blue-200',
    'Đang đón': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Đang đi': 'bg-green-100 text-green-700 border-green-200',
    'Hoàn thành': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const isReloading = isTripsFetching;

  const handleReloadData = () => {
    refetchTrips();
  };

  const statusFilterOptions: Array<{ value: typeof statusFilter; label: string }> = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'Đã phân xe', label: 'Đã phân xe' },
    { value: 'Đang đón', label: 'Đang đón' },
    { value: 'Đang đi', label: 'Đang đi' },
    { value: 'Hoàn thành', label: 'Hoàn thành' },
  ];

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
        <p className="text-muted-foreground">Vui lòng đăng nhập để xem lịch trình tài xế.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-3 border-b bg-white px-4 py-3 shadow-sm md:gap-4 md:px-6 md:py-4">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Lịch Trình Của Tôi</h1>
          <p className="text-xs text-muted-foreground md:text-sm">Xem và quản lý các chuyến đi được phân công</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 px-3 py-4 md:p-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Tổng chuyến</p>
                <p className="text-2xl font-bold text-blue-600 md:text-3xl">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Sắp đi</p>
                <p className="text-2xl font-bold text-purple-600 md:text-3xl">{stats.upcoming}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Đang chạy</p>
                <p className="text-2xl font-bold text-green-600 md:text-3xl">{stats.inProgress}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Hoàn thành</p>
                <p className="text-2xl font-bold text-gray-600 md:text-3xl">{stats.completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Tạm ứng đã duyệt</p>
                <p className="text-2xl font-bold text-amber-600 md:text-3xl">{formatCurrency(outstandingAdvance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Tạm ứng đang chờ</p>
                <p className="text-2xl font-bold text-purple-600 md:text-3xl">{formatCurrency(pendingAdvance)}</p>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-2 border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex justify-between items-center h-full">
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-1">Tiền thu hộ / Cần nộp Cty</p>
                  <p className="text-2xl font-bold text-amber-700 md:text-3xl">{formatCurrency(walletBalance)}</p>
                </div>
                <Link to="/accounting/driver-ledger">
                  <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 uppercase text-xs font-semibold px-4">
                    Lịch sử quỹ
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Date Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Calendar className="text-gray-600" size={20} />
                    <div className="w-full max-w-xs">
                      <DatePickerField
                        value={selectedDate}
                        onChange={setSelectedDate}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Label className="text-xs font-medium text-muted-foreground sm:text-sm" htmlFor="status-filter">
                      Trạng thái
                    </Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                      <SelectTrigger id="status-filter" className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusFilterOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Hiển thị {sortedTrips.length} chuyến trong ngày
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReloadData}
                    disabled={isReloading}
                    className="gap-2"
                  >
                    <RotateCcw className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} />
                    Tải lại dữ liệu
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trips List */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : sortedTrips.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="mx-auto mb-4 text-gray-300" size={64} />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Không có chuyến nào
                </h3>
                <p className="text-muted-foreground">
                  Bạn chưa được phân công chuyến nào trong ngày này
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedTrips.map((trip, index) => {
                const reconciledAmount = trip.customerAdvanceReconciled ?? 0;
                const pendingAmount = trip.customerAdvancePending ?? 0;
                const amountToCollect = trip.customerOutstandingAmount ?? Math.max(trip.price - reconciledAmount, 0);

                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 md:p-6">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2.5 md:p-3">
                              <Clock className="text-blue-600" size={22} />
                            </div>
                            <div>
                              <p className="text-xl font-bold text-gray-800 md:text-2xl">
                                {new Date(trip.pickupTime).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground md:text-sm">Giờ đón khách</p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex w-fit items-center justify-center rounded-full border px-3 py-1 text-xs font-medium ${statusColors[trip.status]}`}
                          >
                            {trip.status}
                          </span>
                        </div>

                        <div className="mb-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <MapPin className="mt-1 flex-shrink-0 text-green-600" size={18} />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-700 md:text-sm">Điểm đón</p>
                              <p className="text-sm text-gray-900 md:text-base">{trip.pickupLocation}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="mt-1 flex-shrink-0 text-red-600" size={18} />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-700 md:text-sm">Điểm trả</p>
                              <p className="text-sm text-gray-900 md:text-base">{trip.dropoffLocation}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 border-t pt-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex flex-col gap-2 text-xs text-muted-foreground md:flex-row md:flex-wrap md:items-center md:gap-4 md:text-sm">
                            <div className="flex items-center gap-2">
                              {trip.fullVehicle ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 md:text-sm">
                                  Thuê nguyên xe
                                </span>
                              ) : (
                                <>
                                  <Users size={16} />
                                  <span>{trip.passengers} người</span>
                                </>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5 md:flex-row md:items-center md:gap-2">
                              <span className="font-semibold text-gray-800">{trip.customerName}</span>
                              <span className="text-xs text-gray-600 md:text-sm">{trip.customerPhone}</span>
                            </div>
                            <div className="flex flex-col">
                              <span
                                className={`flex items-center gap-1 text-sm font-semibold md:text-base ${amountToCollect > 0 ? 'text-amber-600' : 'text-emerald-600'
                                  }`}
                              >
                                <Wallet size={16} />
                                {reconciledAmount > 0
                                  ? `Cần thu khách: ${formatCurrency(amountToCollect)}`
                                  : `Thu khách: ${formatCurrency(trip.price)}`}
                              </span>
                              {reconciledAmount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Đã đối soát: {formatCurrency(reconciledAmount)}
                                  {pendingAmount > 0 && ` • Chờ đối soát: ${formatCurrency(pendingAmount)}`}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-1 md:flex-row md:flex-wrap md:items-center md:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full gap-2 text-sm md:w-auto"
                              onClick={() => openAdvanceDialogForTrip(trip)}
                            >
                              <Wallet size={16} />
                              Tạm ứng phí
                            </Button>

                            {trip.status === 'Đã phân xe' && (
                              <Link to={`/trip-execution/${trip.id}`} className="w-full md:w-auto">
                                <Button className="w-full gap-2 bg-green-600 text-sm hover:bg-green-700 md:w-auto">
                                  Bắt đầu chuyến
                                  <ArrowRight size={16} />
                                </Button>
                              </Link>
                            )}

                            {(trip.status === 'Đang đón' || trip.status === 'Đang đi') && (
                              <Link to={`/trip-execution/${trip.id}`} className="w-full md:w-auto">
                                <Button className="w-full gap-2 bg-blue-600 text-sm hover:bg-blue-700 md:w-auto">
                                  Tiếp tục
                                  <ArrowRight size={16} />
                                </Button>
                              </Link>
                            )}

                            {trip.status === 'Hoàn thành' && (
                              <div className="flex w-full items-center justify-start gap-2 text-green-600 md:w-auto md:justify-end">
                                <CheckCircle size={20} />
                                <span className="text-sm font-medium md:text-base">Đã hoàn thành</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {trip.notes && (
                          <div className="mt-3 border-t pt-3 md:mt-4 md:pt-4">
                            <p className="text-xs text-gray-600 md:text-sm">
                              <span className="font-medium">Ghi chú:</span> {trip.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={financeDialogOpen}
        onOpenChange={(open) => {
          setFinanceDialogOpen(open);
          if (!open) {
            setSelectedAdvanceTrip(null);
            setDriverAdvanceForm({ amount: '', expenseType: 'toll', tripId: '', note: '' });
            setDriverAdvanceImages([]);
            if (driverAdvanceFileInputRef.current) {
              driverAdvanceFileInputRef.current.value = '';
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Đề nghị tạm ứng phí cho chuyến #{selectedAdvanceTrip?.id ?? ''}</DialogTitle>
          </DialogHeader>
          <input
            ref={driverAdvanceFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleDriverAdvanceImagesSelect}
          />
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!driverId || !selectedAdvanceTrip) {
                toast({
                  title: 'Thiếu thông tin chuyến',
                  description: 'Vui lòng chọn lại chuyến cần tạm ứng',
                  variant: 'destructive',
                });
                return;
              }
              const amount = Number(driverAdvanceForm.amount || 0);
              if (!amount || amount <= 0) {
                toast({
                  title: 'Số tiền không hợp lệ',
                  description: 'Nhập số tiền tạm ứng lớn hơn 0',
                  variant: 'destructive',
                });
                return;
              }
              driverAdvanceMutation.mutate({
                driverId,
                tripId: selectedAdvanceTrip.id,
                amount,
                expenseType: driverAdvanceForm.expenseType,
                requestedBy: driverId,
                note: driverAdvanceForm.note.trim() || undefined,
                attachments: driverAdvanceImages,
              });
            }}
          >
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs uppercase text-muted-foreground">Chuyến</p>
                <p className="font-medium text-gray-900">
                  {selectedAdvanceTrip ? `#${selectedAdvanceTrip.id}` : '--'}
                </p>
                {selectedAdvanceTrip && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedAdvanceTrip.pickupTime).toLocaleString('vi-VN', { hour12: false })}
                  </p>
                )}
              </div>
              {selectedAdvanceTrip && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Điểm đón: <span className="text-gray-900">{selectedAdvanceTrip.pickupLocation}</span></p>
                  <p>Điểm trả: <span className="text-gray-900">{selectedAdvanceTrip.dropoffLocation}</span></p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="driver-advance-amount">Số tiền (₫) *</Label>
                <Input
                  id="driver-advance-amount"
                  type="number"
                  min={0}
                  value={driverAdvanceForm.amount}
                  onChange={(event) => setDriverAdvanceForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="Ví dụ: 150000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="driver-advance-expense">Loại chi phí *</Label>
                <Select
                  value={driverAdvanceForm.expenseType}
                  onValueChange={(value) =>
                    setDriverAdvanceForm((prev) => ({ ...prev, expenseType: value as DriverExpenseType }))
                  }
                >
                  <SelectTrigger id="driver-advance-expense">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toll">Phí cầu đường</SelectItem>
                    <SelectItem value="parking">Phí bến bãi</SelectItem>
                    <SelectItem value="fuel">Nhiên liệu</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ảnh chứng từ</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={driverAdvanceImagesLoading}
                  onClick={() => driverAdvanceFileInputRef.current?.click()}
                >
                  {driverAdvanceImages.length
                    ? `Thay ảnh (${driverAdvanceImages.length}/${MAX_VOUCHER_IMAGES})`
                    : 'Đính kèm ảnh (tối đa 3)'}
                </Button>
                {driverAdvanceImages.length > 0 && (
                  <Button type="button" variant="ghost" onClick={() => setDriverAdvanceImages([])}>
                    Xóa ảnh
                  </Button>
                )}
                {driverAdvanceImagesLoading && (
                  <span className="text-xs text-muted-foreground">Đang xử lý ảnh...</span>
                )}
              </div>
              {driverAdvanceImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {driverAdvanceImages.map((file, idx) => (
                    <Badge key={`driver-advance-img-${idx}`} variant="outline">
                      {file.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="driver-advance-note">Ghi chú</Label>
              <Textarea
                id="driver-advance-note"
                rows={3}
                placeholder="Ví dụ: ứng phí cầu đường trước khi đi"
                value={driverAdvanceForm.note}
                onChange={(event) => setDriverAdvanceForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFinanceDialogOpen(false)}
                disabled={driverAdvanceMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={driverAdvanceMutation.isPending || driverAdvanceImagesLoading || !selectedAdvanceTrip}
              >
                {driverAdvanceMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDashboard;