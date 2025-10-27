import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRevenueSummary, createDeposit, getDeposits, getPayments, recordTripPayment } from '@/data/accounting';
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

const Accounting: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [depositValues, setDepositValues] = useState<Record<string, string>>({});
  const [paymentForm, setPaymentForm] = useState({
    tripId: '',
    driverId: '',
    amount: '',
    method: 'cash' as 'cash' | 'transfer',
  });

  const isAccountant = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

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

  const paymentMut = useMutation({
    mutationFn: recordTripPayment,
    onSuccess: () => {
      toast({ title: 'Đã ghi nhận', description: 'Tăng công nợ tài xế theo số tiền đã thu' });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['revenue-summary'] });
    },
    onError: (e: unknown) => {
      toast({
        title: 'Lỗi',
        description: (e instanceof Error ? e.message : String(e)) || 'Không thể ghi nhận thu tiền',
        variant: 'destructive',
      });
    },
  });

  const driverSummaries = summaryQ.data?.byDriver ?? [];
  const totalOutstanding = summaryQ.data?.totalOutstanding ?? 0;

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
            }}
          >
            Xóa lọc
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <TableHead className="text-right">Chuyến hoàn thành</TableHead>
                <TableHead className="text-right">Nộp tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverSummaries.map((driver) => (
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
                  <TableCell className="text-right">{driver.completedTrips}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
                        disabled={depositMut.isPending}
                        onClick={() => {
                          const rawValue = depositValues[driver.driverId];
                          const amount = Number(rawValue || 0);
                          if (!amount || amount <= 0) {
                            toast({ title: 'Lỗi', description: 'Nhập số tiền hợp lệ', variant: 'destructive' });
                            return;
                          }
                          depositMut.mutate({ driverId: driver.driverId, amount, note: 'Nộp tiền mặt' });
                          setDepositValues((prev) => ({ ...prev, [driver.driverId]: '' }));
                        }}
                      >
                        Nộp
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                disabled={paymentMut.isPending}
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
                  });
                  setPaymentForm({ tripId: '', driverId: '', amount: '', method: 'cash' });
                }}
              >
                Ghi nhận
              </Button>
            </div>
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
