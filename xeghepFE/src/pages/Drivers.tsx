import React, { useMemo, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDrivers } from '@/hooks/useApi';
import { mapDriverResponseToDriver, updateDriver } from '@/data/drivers';
import type { DriverRequest } from '@/services/api';
import type { Driver } from '@/data/drivers';
import { useToast } from '@/hooks/use-toast';
import { Search, Star, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const Drivers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const navigate = useNavigate();

  const { data: driversData, isLoading } = useDrivers(searchTerm);
  const drivers = useMemo<Driver[]>(() => {
    return (driversData?.content ?? []).map(mapDriverResponseToDriver);
  }, [driversData]);

  const filteredDrivers = useMemo(() =>
    drivers.filter((driver) =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  [drivers, searchTerm]);

  const statusOptions: { value: DriverRequest['status']; label: string }[] = [
    { value: 'HOAT_DONG', label: 'Hoạt động' },
    { value: 'NGHI_PHEP', label: 'Nghỉ phép' },
    { value: 'NGUNG_HOAT_DONG', label: 'Ngừng hoạt động' },
  ];

  const buildDriverRequest = (driver: Driver, overrides?: Partial<DriverRequest>): DriverRequest => ({
    username: driver.username,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry,
    address: driver.address,
    dateOfBirth: driver.dateOfBirth,
    joinDate: driver.joinDate,
    status: driver.statusCode,
    avatar: driver.avatar,
    vehicleId: driver.vehicleId ? Number(driver.vehicleId) : null,
    ...overrides,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ driver, status }: { driver: Driver; status: DriverRequest['status'] }) => {
      const request = buildDriverRequest(driver, { status });
      return updateDriver(Number(driver.id), request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({ title: 'Cập nhật trạng thái tài xế thành công' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Không thể cập nhật trạng thái',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (driver: Driver, newStatus: DriverRequest['status']) => {
    if (newStatus === driver.statusCode) {
      return;
    }
    updateStatusMutation.mutate({ driver, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hoạt động':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'Nghỉ phép':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'Ngừng hoạt động':
        return 'bg-gray-100 text-gray-700 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Quản Lý Tài Xế</h1>
          <p className="text-sm text-muted-foreground">Danh sách tài xế trong hệ thống</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Search Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm theo tên, số điện thoại, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button className="gap-2" onClick={() => navigate('/drivers/add')}>
                  <Plus size={18} />
                  Thêm tài xế
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Drivers Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Không tìm thấy tài xế nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDrivers.map((driver, index) => (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-2">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-2xl font-semibold shadow-lg">
                          {driver.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-800 mb-1">
                            {driver.name}
                          </h3>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(driver.status)}`}>
                            {driver.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">👤 Tên đăng nhập:</span>
                          <span className="font-medium">{driver.username}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">📞 Điện thoại:</span>
                          <span className="font-medium">{driver.phone}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">✉️ Email:</span>
                          <span className="font-medium text-xs">{driver.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">🪪 Bằng lái:</span>
                          <span className="font-medium">{driver.licenseNumber}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Star className="fill-yellow-400 text-yellow-400" size={14} />
                            Đánh giá
                          </span>
                          <span className="font-bold text-yellow-600">{driver.rating}/5</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <TrendingUp size={14} />
                            Chuyến đi
                          </span>
                          <span className="font-bold text-blue-600">{driver.totalTrips}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar size={14} />
                            Tham gia
                          </span>
                          <span className="font-medium text-sm">
                            {new Date(driver.joinDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Tổng thu nhập</span>
                          <span className="text-lg font-bold text-green-600">
                            {(driver.totalEarnings / 1000000).toFixed(1)}M ₫
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <label htmlFor={`status-${driver.id}`} className="text-xs text-muted-foreground">
                            Trạng thái
                          </label>
                          <select
                            id={`status-${driver.id}`}
                            className="flex-1 border rounded-md h-8 px-2 text-sm"
                            value={driver.statusCode ?? 'HOAT_DONG'}
                            onChange={(e) => handleStatusChange(driver, e.target.value as DriverRequest['status'])}
                            disabled={updateStatusMutation.isPending}
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Drivers;