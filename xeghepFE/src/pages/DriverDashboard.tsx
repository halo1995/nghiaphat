import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTrips, type Trip } from '@/data/trips';
import { Calendar, MapPin, Users, Clock, ArrowRight, CheckCircle, Wallet } from 'lucide-react';
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
  deducted: 'Đã khấu trừ',
  rejected: 'Từ chối',
};

const driverStatusVariants: Record<DriverExpenseStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
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

const DriverDashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  const { data: allTrips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
    enabled: isAuthenticated && !authLoading,
  });

  const driverAdvancesQ = useQuery({
    queryKey: ['driver-expense-advances', driverId],
    queryFn: () => getDriverExpenseAdvances({ driverId }),
    enabled: isAuthenticated && !authLoading && !!driverId,
  });

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

  // Sort by pickup time
  const sortedTrips = [...myTrips].sort((a, b) => 
    new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime()
  );

  const stats = {
    total: myTrips.length,
    completed: myTrips.filter(t => t.status === 'Hoàn thành').length,
    inProgress: myTrips.filter(t => t.status === 'Đang đi' || t.status === 'Đang đón').length,
    upcoming: myTrips.filter(t => t.status === 'Đã phân xe').length,
  };

  const driverAdvances = driverAdvancesQ.data ?? [];
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
          </div>

          {/* Date Filter */}
          <Card>
            <CardContent className="p-4">
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
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Hiển thị {sortedTrips.length} chuyến trong ngày
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Lịch sử tạm ứng của tôi</h2>
                <p className="text-sm text-muted-foreground">Theo dõi trạng thái phê duyệt và khấu trừ</p>
              </div>
              {driverAdvancesQ.isLoading ? (
                <div className="p-6 text-center text-muted-foreground">Đang tải danh sách tạm ứng...</div>
              ) : driverAdvances.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">Bạn chưa có yêu cầu tạm ứng nào</div>
              ) : (
                <>
                  {/* Mobile: card list */}
                  <div className="space-y-3 px-4 py-4 md:hidden">
                    {driverAdvances.map((advance) => (
                      <div key={advance.id} className="rounded-lg border bg-white p-3 text-sm shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {driverExpenseLabels[advance.expenseType]}
                            </span>
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
                          <span className="text-base font-semibold text-gray-900">
                            {advance.amount.toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {advance.tripId && (
                            <p className="text-xs text-muted-foreground">Chuyến #{advance.tripId}</p>
                          )}
                          {advance.note && (
                            <p className="text-xs text-gray-700">Ghi chú: {advance.note}</p>
                          )}
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
                            <td className="px-6 py-3 text-right font-medium text-gray-900">{advance.amount.toLocaleString('vi-VN')} ₫</td>
                            <td className="px-6 py-3">
                              <Badge variant={driverStatusVariants[advance.status]}>{driverStatusLabels[advance.status]}</Badge>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-col gap-1">
                                {advance.note && <span>{advance.note}</span>}
                                {advance.rejectionReason && (
                                  <span className="text-xs text-destructive">Lý do từ chối: {advance.rejectionReason}</span>
                                )}
                                {advance.tripId && (
                                  <span className="text-xs text-muted-foreground">Chuyến #{advance.tripId}</span>
                                )}
                                {advance.attachments.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    {advance.attachments.map((attachment) => (
                                      <Button key={attachment.id} variant="link" size="sm" className="justify-start px-0" asChild>
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
                      <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <Clock className="text-blue-600" size={24} />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-800">
                              {new Date(trip.pickupTime).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">Giờ đón khách</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[trip.status]}`}>
                          {trip.status}
                        </span>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="text-green-600 mt-1 flex-shrink-0" size={18} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">Điểm đón</p>
                            <p className="text-base text-gray-900">{trip.pickupLocation}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="text-red-600 mt-1 flex-shrink-0" size={18} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">Điểm trả</p>
                            <p className="text-base text-gray-900">{trip.dropoffLocation}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 pt-4 border-t md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users size={16} />
                            {trip.passengers} người
                          </span>
                          <span>📏 {trip.distance} km</span>
                          <span className="font-semibold text-gray-800">{trip.customerName}</span>
                          <span>{trip.customerPhone}</span>
                          <div className="flex flex-col">
                            <span
                              className={`flex items-center gap-1 font-semibold ${
                                amountToCollect > 0 ? 'text-amber-600' : 'text-emerald-600'
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
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => openAdvanceDialogForTrip(trip)}
                          >
                            <Wallet size={16} />
                            Tạm ứng phí
                          </Button>

                          {trip.status === 'Đã phân xe' && (
                            <Link to={`/trip-execution/${trip.id}`}>
                              <Button className="gap-2 bg-green-600 hover:bg-green-700">
                                Bắt đầu chuyến
                                <ArrowRight size={16} />
                              </Button>
                            </Link>
                          )}

                          {(trip.status === 'Đang đón' || trip.status === 'Đang đi') && (
                            <Link to={`/trip-execution/${trip.id}`}>
                              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                Tiếp tục
                                <ArrowRight size={16} />
                              </Button>
                            </Link>
                          )}

                          {trip.status === 'Hoàn thành' && (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle size={20} />
                              <span className="font-medium">Đã hoàn thành</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {trip.notes && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-600">
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