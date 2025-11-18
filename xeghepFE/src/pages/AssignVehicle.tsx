import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTripGroups, updateTripGroup, getTrips, updateTrip } from '@/data/trips';
import { getVehicles, type Vehicle } from '@/data/vehicles';
import { getDrivers, type Driver } from '@/data/drivers';
import { ArrowLeft, Truck, CheckCircle, Users, Star, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const AssignVehicle = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const { data: groups = [] } = useQuery({
    queryKey: ['tripGroups'],
    queryFn: getTripGroups,
    enabled: isAuthenticated && !authLoading,
  });

  const { data: vehicles = [], refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });

  const { data: drivers = [], refetch: refetchDrivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
    enabled: isAuthenticated && !authLoading,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
    enabled: isAuthenticated && !authLoading,
  });

  const group = groups.find(g => g.id === groupId);
  const availableVehicles = useMemo<Vehicle[]>(() => {
    const byId = new Map<string, Vehicle>();
    vehicles.forEach((vehicle) => {
      if (vehicle.status === 'Sẵn sàng' && !byId.has(vehicle.id)) {
        byId.set(vehicle.id, vehicle);
      }
    });
    return Array.from(byId.values());
  }, [vehicles]);

  const availableDrivers = useMemo<Driver[]>(() => {
    const byId = new Map<string, Driver>();
    drivers.forEach((driver) => {
      if (driver.statusCode !== 'HOAT_DONG') {
        return;
      }

      if (driver.vehicleId && driver.vehicleId !== selectedVehicleId) {
        return;
      }

      if (!byId.has(driver.id)) {
        byId.set(driver.id, driver);
      }
    });
    return Array.from(byId.values());
  }, [drivers, selectedVehicleId]);

  const formatDriverStatus = (status?: string | null) => {
    if (!status) return 'Không rõ';
    const normalized = status.toString().toUpperCase();
    switch (normalized) {
      case 'HOAT_DONG':
        return 'Hoạt động';
      case 'SAN_SANG':
        return 'Sẵn sàng';
      case 'NGHI_PHEP':
        return 'Nghỉ phép';
      case 'NGUNG_HOAT_DONG':
        return 'Ngừng hoạt động';
      default:
        return status;
    }
  };

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      refetchVehicles();
      refetchDrivers();
    }
  }, [isAuthenticated, authLoading, refetchVehicles, refetchDrivers]);

  useEffect(() => {
    if (selectedVehicleId && !availableVehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
      setSelectedVehicleId('');
      setSelectedDriverId('');
    }
  }, [selectedVehicleId, availableVehicles]);

  useEffect(() => {
    if (selectedDriverId && !availableDrivers.some((driver) => driver.id === selectedDriverId)) {
      setSelectedDriverId('');
    }
  }, [selectedDriverId, availableDrivers]);

  const assignMutation = useMutation({
    mutationFn: async ({ vehicleId }: { vehicleId: string }) => {
      const vehicle = availableVehicles.find((v) => v.id === vehicleId);
      const driver = availableDrivers.find((d) => d.id === selectedDriverId);
      if (!vehicle || !group || !driver) throw new Error('Vehicle, driver hoặc nhóm không hợp lệ');

      // Update group with vehicle info
      await updateTripGroup(groupId!, {
        vehicleId: vehicle.id,
        vehicleName: `${vehicle.name} - ${vehicle.licensePlate}`,
        driverId: driver.id,
        driverName: driver.name,
        status: 'Đã phân xe'
      });

      // Update all trips in group
      for (const tripId of group.tripIds) {
        await updateTrip(tripId, {
          vehicleId: vehicle.id,
          vehicleName: `${vehicle.name} - ${vehicle.licensePlate}`,
          driverId: driver.id,
          driverName: driver.name,
          status: 'Đã phân xe',
          assignedAt: new Date().toISOString()
        });
      }

      // Update vehicle status
      // Note: In real app, you'd update vehicle status to 'Đang chạy'
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripGroups'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      toast({
        title: "Đã phân xe",
        description: "Xe và tài xế đã được phân công thành công",
      });
      
      navigate('/group-trips');
    },
  });

  const handleAssign = () => {
    if (!selectedVehicleId) {
      toast({
        title: "Chưa chọn xe",
        description: "Vui lòng chọn xe để phân công",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDriverId) {
      toast({
        title: "Chưa chọn tài xế",
        description: "Vui lòng chọn tài xế để phân công",
        variant: "destructive"
      });
      return;
    }

    assignMutation.mutate({ vehicleId: selectedVehicleId });
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
        <p className="text-muted-foreground">Vui lòng đăng nhập để phân xe cho nhóm chuyến.</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Không tìm thấy nhóm chuyến</p>
        <Button onClick={() => navigate('/group-trips')}>Quay lại</Button>
      </div>
    );
  }

  const groupTrips = trips.filter((t) => group.tripIds.includes(t.id));
  const isFullVehicleGroup = groupTrips.some((trip) => trip.fullVehicle);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <Button variant="ghost" size="icon" onClick={() => navigate('/group-trips')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Phân Xe & Tài Xế</h1>
          <p className="text-sm text-muted-foreground">{group.name}</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Group Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông Tin Nhóm Chuyến</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Số chuyến</p>
                  <p className="text-2xl font-bold text-blue-600">{group.tripIds.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    {isFullVehicleGroup ? 'Hình thức' : 'Tổng hành khách'}
                  </p>
                  {isFullVehicleGroup ? (
                    <p className="text-sm font-semibold text-green-700 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1">
                      Thuê nguyên xe
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-purple-600">{group.totalPassengers}</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Doanh thu</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(group.totalRevenue / 1000000).toFixed(1)}M ₫
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Danh sách chuyến:</p>
                {groupTrips.map((trip) => (
                  <div key={trip.id} className="p-3 bg-white border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{trip.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {trip.pickupLocation} → {trip.dropoffLocation}
                        </p>
                        {trip.fullVehicle && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            Thuê nguyên xe
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                          {new Date(trip.pickupTime).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {trip.fullVehicle ? (
                          <span className="inline-flex items-center justify-end gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            Thuê nguyên xe
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-end gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                            {trip.passengers} người
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Chọn Xe & Tài Xế</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Chọn xe sẵn sàng *</Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder="Chọn xe phù hợp" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Không có xe sẵn sàng
                      </div>
                    ) : (
                      availableVehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{vehicle.name}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm">{vehicle.licensePlate}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm">{vehicle.seats} chỗ</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver">Chọn tài xế sẵn sàng *</Label>
                <Select
                  value={selectedDriverId}
                  onValueChange={setSelectedDriverId}
                  disabled={!selectedVehicleId || availableDrivers.length === 0}
                >
                  <SelectTrigger id="driver">
                    <SelectValue placeholder="Chọn tài xế phù hợp" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDrivers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Không có tài xế sẵn sàng
                      </div>
                    ) : (
                      availableDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          <div className="flex items-center gap-2">
                            <User size={14} />
                            <span className="font-medium">{driver.name}</span>
                            <span className="text-muted-foreground text-xs">({driver.username})</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm">{driver.phone}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm">{formatDriverStatus(driver.statusCode)}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedVehicle && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-green-900 mb-3">Thông tin xe đã chọn</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-green-700 mb-1">Xe</p>
                        <p className="font-semibold text-green-900">
                          {selectedVehicle.name} - {selectedVehicle.licensePlate}
                        </p>
                        <p className="text-sm text-green-700 mt-1">
                          <Users size={14} className="inline mr-1" />
                          {selectedVehicle.seats} chỗ ngồi
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700 mb-1">Tài xế</p>
                        <p className="font-semibold text-green-900">
                          {selectedDriver ? selectedDriver.name : 'Chưa chọn tài xế'}
                        </p>
                        {selectedDriver && (
                          <p className="text-sm text-green-700 mt-1">
                            <User size={14} className="inline mr-1" />
                            {selectedDriver.phone}
                            <span className="ml-2 text-muted-foreground">
                              ({formatDriverStatus(selectedDriver.status)})
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedVehicle.seats < group.totalPassengers && (
                      <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded">
                        <p className="text-sm text-orange-800">
                          ⚠️ Cảnh báo: Xe chỉ có {selectedVehicle.seats} chỗ nhưng nhóm có {group.totalPassengers} hành khách
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleAssign}
                disabled={!selectedVehicleId || !selectedDriverId || assignMutation.isPending || availableVehicles.length === 0 || availableDrivers.length === 0}
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle size={20} />
                {assignMutation.isPending ? 'Đang phân công...' : 'Xác Nhận Phân Xe'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AssignVehicle;