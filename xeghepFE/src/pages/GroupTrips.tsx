import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TripGroup, Trip } from '@/data/trips';
import { getTripGroups, getTrips, updateTrip, updateTripGroup, deleteTripGroup } from '@/data/trips';
import type { Driver } from '@/data/drivers';
import { getDrivers } from '@/data/drivers';
import type { Vehicle } from '@/data/vehicles';
import { getVehicles } from '@/data/vehicles';
import { Truck, Users, DollarSign, ArrowRight, GitMerge, Pencil, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DatePickerField } from '@/components/ui/date-picker-field';

const getTodayLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const GroupTrips = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<string>(() => getTodayLocalDate());

  const { data: groups = [], isLoading } = useQuery<TripGroup[]>({
    queryKey: ['tripGroups', dateFilter],
    queryFn: () => getTripGroups(dateFilter),
    enabled: isAuthenticated && !authLoading,
  });

  // Load trips with pickupDate matching the selected date
  // This ensures we only load relevant trips for the groups being displayed
  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ['trips-for-groups', dateFilter],
    queryFn: () => getTrips(dateFilter), // Load trips for selected date
    enabled: isAuthenticated && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to reduce re-fetching
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: getDrivers,
    enabled: isAuthenticated && !authLoading,
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    enabled: isAuthenticated && !authLoading,
  });

  const [editingGroup, setEditingGroup] = useState<TripGroup | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('none');
  const [selectedDriverId, setSelectedDriverId] = useState('none');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'vehicleAssigned' | 'driverAssigned' | 'unassigned'>('all');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const lockedTripIds = useMemo(() => new Set<string>(
    trips
      .filter((trip) =>
        trip.pickupConfirmed === true ||
        ['Đang đón', 'Đang đi', 'Hoàn thành'].includes(trip.status)
      )
      .map((trip) => trip.id)
  ), [trips]);

  const isGroupLocked = useCallback((group: TripGroup) => {
    return group.tripIds.some((tripId) => lockedTripIds.has(tripId));
  }, [lockedTripIds]);

  const availableVehicles = useMemo<Vehicle[]>(() => vehicles, [vehicles]);

  const availableDrivers = useMemo(() => {
    if (selectedVehicleId === 'none') return [] as Driver[];
    return drivers.filter((driver) => {
      if (!driver.vehicleId) return true;
      return driver.vehicleId.toString() === selectedVehicleId;
    });
  }, [drivers, selectedVehicleId]);

  const tripById = useMemo(() => new Map(trips.map((trip) => [trip.id, trip])), [trips]);

  const availableTrips = useMemo(() => {
    if (!editingGroup) return [] as Trip[];
    const groupHasFullVehicle = editingGroup.tripIds.some((id) => tripById.get(id)?.fullVehicle);
    
    // Get pickup date from first trip in group
    const groupPickupDate = editingGroup.tripIds.length > 0
      ? tripById.get(editingGroup.tripIds[0])?.pickupTime?.slice(0, 10)
      : dateFilter;
    
    return trips.filter((trip: Trip) => {
      if (trip.pickupConfirmed === true) {
        return false;
      }
      if (trip.groupId === editingGroup.id) {
        return true;
      }
      if (groupHasFullVehicle) {
        return false;
      }
      
      // Only show trips with same pickup date as group
      const tripPickupDate = trip.pickupTime?.slice(0, 10);
      if (tripPickupDate !== groupPickupDate) {
        return false;
      }
      
      return !trip.groupId && !['Đang đón', 'Đang đi', 'Hoàn thành', 'Đã hủy'].includes(trip.status);
    });
  }, [editingGroup, trips, tripById, dateFilter]);
  const groupFullVehicleMap = useMemo(() =>
    new Map(groups.map(group => [group.id, group.tripIds.some((tripId) => tripById.get(tripId)?.fullVehicle)])),
    [groups, tripById]);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const matchesDate = !dateFilter || group.tripIds.some((tripId) => {
        const trip = tripById.get(tripId);
        return trip?.pickupTime?.startsWith(dateFilter);
      });

      if (!matchesDate) {
        return false;
      }

      switch (assignmentFilter) {
        case 'vehicleAssigned':
          return Boolean(group.vehicleId);
        case 'driverAssigned':
          return Boolean(group.driverId);
        case 'unassigned':
          return !group.vehicleId;
        default:
          return true;
      }
    });
  }, [groups, tripById, dateFilter, assignmentFilter]);

  useEffect(() => {
    if (selectedVehicleId === 'none') {
      setSelectedDriverId('none');
      return;
    }

    if (
      selectedDriverId !== 'none' &&
      !availableDrivers.some((driver) => driver.id?.toString() === selectedDriverId)
    ) {
      setSelectedDriverId('none');
    }
  }, [selectedVehicleId, selectedDriverId, availableDrivers]);

  const selectedTripDetails = useMemo<Trip[]>(() => {
    if (!selectedTripIds.length) return [];
    return trips.filter((trip) => selectedTripIds.includes(trip.id));
  }, [trips, selectedTripIds]);

  const totalPassengers = useMemo(() => {
    return selectedTripDetails.reduce((sum, trip) => sum + (trip.passengers ?? 0), 0);
  }, [selectedTripDetails]);

  const totalRevenue = useMemo(() => {
    return selectedTripDetails.reduce((sum, trip) => sum + (trip.price ?? 0), 0);
  }, [selectedTripDetails]);

  const editingGroupLocked = editingGroup ? isGroupLocked(editingGroup) : false;

  interface EditPayload {
    group: TripGroup;
    tripIds: string[];
    tripDetails: Trip[];
    vehicle?: Vehicle;
    driver?: Driver;
  }

  interface RemoveTripPayload {
    group: TripGroup;
    tripId: string;
  }

  const editGroupMutation = useMutation({
    mutationFn: async ({ group, tripIds, tripDetails, vehicle, driver }: EditPayload) => {
      const originalTripIds = group.tripIds;
      const removedTripIds = originalTripIds.filter((id) => !tripIds.includes(id));

      await Promise.all(
        removedTripIds.map((id) =>
          updateTrip(id, {
            groupId: '',
            status: 'Đã xác nhận',
            vehicleId: undefined,
            vehicleName: undefined,
            driverId: undefined,
            driverName: undefined,
          })
        )
      );

      const nextTripStatus = vehicle && driver ? 'Đã phân xe' : 'Đã ghép chuyến';
      const vehicleId = vehicle?.id != null ? vehicle.id.toString() : undefined;
      const vehicleName = vehicle ? `${vehicle.name} - ${vehicle.licensePlate}` : undefined;
      const driverId = driver?.id != null ? driver.id.toString() : undefined;
      const driverName = driver?.name;

      await Promise.all(
        tripIds.map((id) =>
          updateTrip(id, {
            groupId: group.id,
            status: nextTripStatus,
            vehicleId,
            vehicleName,
            driverId,
            driverName,
          })
        )
      );

      const totalPassengers = tripDetails.reduce((sum, trip) => sum + (trip.passengers ?? 0), 0);
      const totalRevenue = tripDetails.reduce((sum, trip) => sum + (trip.price ?? 0), 0);

      await updateTripGroup(group.id, {
        tripIds,
        vehicleId,
        vehicleName,
        driverId,
        driverName,
        status: vehicle && driver ? 'Đã phân xe' : 'Đang ghép',
        totalPassengers,
        totalRevenue,
      });
    },
    onSuccess: () => {
      // Only invalidate queries that need to be refetched
      queryClient.invalidateQueries({ queryKey: ['tripGroups'] });
      queryClient.invalidateQueries({ queryKey: ['trips-for-groups'] });
      toast({
        title: 'Đã cập nhật nhóm chuyến',
        description: 'Danh sách khách và phương tiện đã được cập nhật',
      });
      setIsDialogOpen(false);
      resetEditState();
    },
    onError: (error) => {
      toast({
        title: 'Không thể cập nhật',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lưu dữ liệu',
        variant: 'destructive',
      });
    },
  });

  const removeTripMutation = useMutation({
    mutationFn: async ({ group, tripId }: RemoveTripPayload) => {
      await updateTrip(tripId, {
        groupId: '',
        status: 'Đã xác nhận',
        vehicleId: undefined,
        vehicleName: undefined,
        driverId: undefined,
        driverName: undefined,
      });

      const remainingTripIds = group.tripIds.filter((id) => id !== tripId);
      const remainingTrips = trips.filter((trip) => remainingTripIds.includes(trip.id));
      const totalPassengers = remainingTrips.reduce((sum, trip) => sum + (trip.passengers ?? 0), 0);
      const totalRevenue = remainingTrips.reduce((sum, trip) => sum + (trip.price ?? 0), 0);

      await updateTripGroup(group.id, {
        tripIds: remainingTripIds,
        vehicleId: group.vehicleId,
        vehicleName: group.vehicleName,
        driverId: group.driverId,
        driverName: group.driverName,
        status: remainingTripIds.length === 0 ? 'Đang ghép' : group.status,
        totalPassengers,
        totalRevenue,
      });
    },
    onSuccess: () => {
      // Only invalidate queries that need to be refetched
      queryClient.invalidateQueries({ queryKey: ['tripGroups'] });
      queryClient.invalidateQueries({ queryKey: ['trips-for-groups'] });
      toast({
        title: 'Đã loại bỏ chuyến',
        description: 'Chuyến đã được đưa ra khỏi nhóm',
      });
    },
    onError: (error) => {
      toast({
        title: 'Không thể loại bỏ',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật nhóm',
        variant: 'destructive',
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (group: TripGroup) => {
      await Promise.all(
        group.tripIds.map((tripId) =>
          updateTrip(tripId, {
            groupId: '',
            status: 'Đã xác nhận',
            vehicleId: undefined,
            vehicleName: undefined,
            driverId: undefined,
            driverName: undefined,
          })
        )
      );

      await deleteTripGroup(group.id);
    },
    onSuccess: () => {
      // Only invalidate queries that need to be refetched
      queryClient.invalidateQueries({ queryKey: ['tripGroups'] });
      queryClient.invalidateQueries({ queryKey: ['trips-for-groups'] });
      toast({
        title: 'Đã xoá nhóm chuyến',
        description: 'Nhóm chuyến đã được xoá và các chuyến đã được trả lại trạng thái ban đầu',
      });
    },
    onError: (error) => {
      toast({
        title: 'Không thể xoá nhóm',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xoá nhóm',
        variant: 'destructive',
      });
    },
  });

  const isEditing = editGroupMutation.isPending;
  const isRemovingTrip = removeTripMutation.isPending;
  const isDeletingGroup = deleteGroupMutation.isPending;

  const resetEditState = () => {
    setEditingGroup(null);
    setSelectedTripIds([]);
    setSelectedVehicleId('none');
    setSelectedDriverId('none');
  };

  const handleCloseDialog = () => {
    if (isEditing) return;
    setIsDialogOpen(false);
    resetEditState();
  };

  const handleRemoveTrip = (group: TripGroup, tripId: string) => {
    if (isGroupLocked(group)) {
      toast({
        title: 'Không thể chỉnh sửa',
        description: 'Tài xế đã xác nhận đón khách, không thể thay đổi nhóm chuyến.',
        variant: 'destructive',
      });
      return;
    }
    const trip = tripById.get(tripId);
    if (trip?.fullVehicle) {
      toast({
        title: 'Không thể loại bỏ',
        description: 'Chuyến thuê nguyên xe không thể tách khỏi nhóm.',
        variant: 'destructive',
      });
      return;
    }
    removeTripMutation.mutate({ group, tripId });
  };

  const handleDeleteGroup = (group: TripGroup) => {
    if (isGroupLocked(group)) {
      toast({
        title: 'Không thể xoá nhóm',
        description: 'Không thể xoá nhóm sau khi tài xế đã xác nhận đón hành khách.',
        variant: 'destructive',
      });
      return;
    }
    if (!window.confirm('Bạn chắc chắn muốn xoá nhóm này? Tất cả các chuyến sẽ trở lại trạng thái chờ xác nhận.')) {
      return;
    }
    deleteGroupMutation.mutate(group);
  };

  const handleToggleTrip = (tripId: string) => {
    if (editingGroupLocked) {
      toast({
        title: 'Không thể chỉnh sửa',
        description: 'Nhóm đã bị khoá vì tài xế đã xác nhận đón hành khách.',
        variant: 'destructive',
      });
      return;
    }
    const trip = tripById.get(tripId);
    if (trip?.fullVehicle) {
      toast({
        title: 'Không thể thay đổi',
        description: 'Chuyến thuê nguyên xe không hỗ trợ ghép thêm hoặc tách khách.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    );
  };

  const handleOpenEdit = (group: TripGroup) => {
    if (isGroupLocked(group)) {
      toast({
        title: 'Không thể chỉnh sửa',
        description: 'Nhóm chuyến đã khoá vì tài xế đã xác nhận đón hành khách.',
        variant: 'destructive',
      });
      return;
    }
    setEditingGroup(group);
    setSelectedTripIds([...group.tripIds]);
    setSelectedVehicleId(group.vehicleId ?? 'none');
    setSelectedDriverId(group.driverId ?? 'none');
    setIsDialogOpen(true);
  };

  const handleNavigateToAssignVehicle = (groupId: string) => {
    navigate(`/assign-vehicle/${groupId}`, {
      state: { dateFilter }
    });
  };

  const handleSave = () => {
    if (!editingGroup) return;
    if (isGroupLocked(editingGroup)) {
      toast({
        title: 'Không thể lưu thay đổi',
        description: 'Nhóm đã bị khoá vì tài xế đã xác nhận đón khách.',
        variant: 'destructive',
      });
      setIsDialogOpen(false);
      resetEditState();
      return;
    }
    if (selectedTripIds.length === 0) {
      toast({
        title: 'Chưa chọn chuyến',
        description: 'Vui lòng chọn ít nhất một chuyến trong nhóm',
        variant: 'destructive',
      });
      return;
    }

    const vehicle = selectedVehicleId === 'none' ? undefined : vehicles.find((item) => item.id?.toString() === selectedVehicleId);
    const driver = selectedDriverId === 'none' ? undefined : drivers.find((item) => item.id?.toString() === selectedDriverId);

    editGroupMutation.mutate({
      group: editingGroup,
      tripIds: selectedTripIds,
      tripDetails: selectedTripDetails,
      vehicle,
      driver,
    });
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
        <p className="text-muted-foreground">Vui lòng đăng nhập để quản lý nhóm chuyến.</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'Đang ghép': 'bg-blue-100 text-blue-700 border-blue-200',
    'Đã phân xe': 'bg-purple-100 text-purple-700 border-purple-200',
    'Đang chạy': 'bg-green-100 text-green-700 border-green-200',
    'Hoàn thành': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const tripStatusColors: Record<string, string> = {
    'Chờ xác nhận': 'bg-orange-100 text-orange-700 border-orange-200',
    'Đã xác nhận': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Đã ghép chuyến': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'Đã phân xe': 'bg-purple-100 text-purple-700 border-purple-200',
    'Đang đón': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Đang đi': 'bg-blue-100 text-blue-700 border-blue-200',
    'Hoàn thành': 'bg-gray-100 text-gray-700 border-gray-200',
    'Đã hủy': 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Nhóm Chuyến Đã Ghép</h1>
          <p className="text-sm text-muted-foreground">Quản lý và phân xe cho các nhóm chuyến</p>
        </div>
        <Link to="/dispatch">
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <GitMerge size={20} />
            Ghép Chuyến Mới
          </Button>
        </Link>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto space-y-6">
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Chọn ngày hiển thị nhóm chuyến
              </div>
              <div className="w-full sm:w-64">
                <DatePickerField
                  value={dateFilter}
                  onChange={(value) => {
                    setDateFilter(value);
                    // React Query will automatically refetch when queryKey changes
                  }}
                  allowClear
                  placeholder="Chọn ngày"
                />
              </div>
              <div className="w-full sm:w-64">
                <Select value={assignmentFilter} onValueChange={(value) => setAssignmentFilter(value as typeof assignmentFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Trạng thái phân xe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="vehicleAssigned">Đã phân xe</SelectItem>
                    <SelectItem value="driverAssigned">Đã phân tài xế</SelectItem>
                    <SelectItem value="unassigned">Chưa phân xe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Truck className="mx-auto mb-4 text-gray-300" size={64} />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Chưa có nhóm chuyến nào
                </h3>
                <p className="text-muted-foreground mb-4">
                  Vào trang "Ghép Chuyến" để tạo nhóm chuyến mới
                </p>
                <Link to="/dispatch">
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <GitMerge size={20} />
                    Đi đến Ghép Chuyến
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Truck className="mx-auto mb-4 text-gray-300" size={64} />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Không có nhóm chuyến trong ngày đã chọn
                </h3>
                <p className="text-muted-foreground">
                  Điều chỉnh bộ lọc ngày để xem thêm nhóm chuyến
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredGroups.map((group, index) => {
                const groupTrips = trips.filter((t) => group.tripIds.includes(t.id));
                
                // Debug: Log if group has trips but groupTrips is empty
                if (group.tripIds.length > 0 && groupTrips.length === 0) {
                  console.log('Group has tripIds but no matching trips found:', {
                    groupId: group.id,
                    groupName: group.name,
                    tripIds: group.tripIds,
                    availableTrips: trips.map(t => ({ id: t.id, fullVehicle: t.fullVehicle }))
                  });
                }
                
                const groupLocked = isGroupLocked(group);
                const canEditGroup = !groupLocked && group.status !== 'Đang chạy' && group.status !== 'Hoàn thành';
                const isFullVehicleGroup = groupFullVehicleMap.get(group.id) === true;

                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">
                              {group.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Tạo lúc: {new Date(group.createdAt).toLocaleString('vi-VN')}
                            </p>
                            {isFullVehicleGroup && (
                              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                Thuê nguyên xe
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[group.status]}`}>
                              {group.status}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleOpenEdit(group)}
                              disabled={!canEditGroup}
                              title={
                                canEditGroup
                                  ? 'Chỉnh sửa nhóm chuyến'
                                  : groupLocked
                                    ? 'Không thể chỉnh sửa khi tài xế đã xác nhận đón khách'
                                    : 'Không thể chỉnh sửa khi nhóm đang chạy hoặc đã hoàn thành'
                              }
                            >
                              <Pencil size={16} />
                              Sửa
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteGroup(group)}
                              disabled={isDeletingGroup || groupLocked}
                              title={groupLocked ? 'Không thể xoá nhóm vì tài xế đã xác nhận đón khách' : undefined}
                            >
                              Xoá
                            </Button>
                          </div>
                        </div>
                        {groupLocked && (
                          <div className="mb-4 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                            <AlertTriangle size={16} />
                            Tài xế đã xác nhận đón khách. Nhóm này đã bị khoá và không thể chỉnh sửa.
                          </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1">Số chuyến</p>
                            <p className="text-2xl font-bold text-blue-600">{group.tripIds.length}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1">
                              <Users size={14} />
                              Hành khách
                            </p>
                            <p className="text-2xl font-bold text-purple-600">{group.totalPassengers}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1">
                              <DollarSign size={14} />
                              Doanh thu
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              {(group.totalRevenue / 1000000).toFixed(1)}M
                            </p>
                          </div>
                        </div>

                        {/* Vehicle Assignment */}
                        {group.vehicleId ? (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-green-700 mb-1">Đã phân xe</p>
                                <p className="font-semibold text-green-900">
                                  🚗 {group.vehicleName}
                                </p>
                                <p className="text-sm text-green-700">
                                  👤 Tài xế: {group.driverName}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                            <p className="text-sm text-orange-700 mb-2">
                              ⚠️ Chưa phân xe và tài xế
                            </p>
                            <Button 
                              size="sm" 
                              className="gap-2 bg-orange-600 hover:bg-orange-700"
                              onClick={() => handleNavigateToAssignVehicle(group.id)}
                            >
                              <Truck size={16} />
                              Phân Xe Ngay
                            </Button>
                          </div>
                        )}

                        {/* Trip List */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Danh sách chuyến trong nhóm:
                          </p>
                          {groupTrips.map((trip) => (
                            <div key={trip.id} className="p-3 bg-white border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-800">{trip.customerName}</p>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${tripStatusColors[trip.status] || 'bg-gray-100 text-gray-700'}`}>
                                      {trip.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {trip.pickupLocation} → {trip.dropoffLocation}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-700">
                                      {new Date(trip.pickupTime).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                    {trip.fullVehicle ? (
                                      <span className="mt-1 inline-flex items-center justify-end gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                        Thuê nguyên xe
                                      </span>
                                    ) : (
                                      <span className="mt-1 inline-flex items-center justify-end gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                                        {trip.passengers} người
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleRemoveTrip(group, trip.id)}
                                    disabled={isRemovingTrip || groupLocked || trip.fullVehicle}
                                    title={trip.fullVehicle ? 'Chuyến thuê nguyên xe không thể loại bỏ khỏi nhóm' : undefined}
                                  >
                                    Loại bỏ
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        {!group.vehicleId && (
                          <div className="mt-4 pt-4 border-t">
                            <Button 
                              className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                              onClick={() => handleNavigateToAssignVehicle(group.id)}
                            >
                              <Truck size={20} />
                              Phân Xe & Tài Xế
                              <ArrowRight size={16} />
                            </Button>
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
      <Dialog open={isDialogOpen} onOpenChange={(open) => (!open ? handleCloseDialog() : setIsDialogOpen(true))}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa nhóm chuyến</DialogTitle>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-6">
              {editingGroupLocked && (
                <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                  <AlertTriangle size={16} />
                  Nhóm đã bị khoá vì tài xế đã xác nhận đón khách. Bạn chỉ có thể xem thông tin.
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Chọn chuyến trong nhóm</Label>
                  <span className="text-sm text-muted-foreground">
                    Đang chọn {selectedTripIds.length} chuyến
                  </span>
                </div>
                <ScrollArea className="h-64 rounded-md border">
                  <div className="p-3 space-y-3">
                    {availableTrips.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Không có chuyến phù hợp để thêm vào nhóm này
                      </p>
                    ) : (
                      availableTrips.map((trip) => {
                        const checked = selectedTripIds.includes(trip.id);
                        const statusLocked = ['Đang đón', 'Đang đi', 'Hoàn thành', 'Đã hủy'].includes(trip.status);
                        const disabled = (!!trip.groupId && trip.groupId !== editingGroup.id) || statusLocked;
                        const isFullVehicle = trip.fullVehicle;
                        const preventChanges = isFullVehicle && trip.groupId === editingGroup?.id;
                        return (
                          <label
                            key={trip.id}
                            className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                              } ${(disabled || preventChanges) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => !(disabled || preventChanges) && handleToggleTrip(trip.id)}
                              disabled={disabled || isEditing || editingGroupLocked || preventChanges}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-gray-800">{trip.customerName}</p>
                                <span className="text-sm font-medium text-green-600">
                                  {trip.price.toLocaleString('vi-VN')} ₫
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {trip.pickupLocation} → {trip.dropoffLocation}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(trip.pickupTime).toLocaleString('vi-VN')} • {trip.fullVehicle ? 'Thuê nguyên xe' : `${trip.passengers} người`}
                              </p>
                              {isFullVehicle && (
                                <p className="text-xs text-green-600 mt-1 font-medium">
                                  Thuê nguyên xe — không thể ghép thêm khách
                                </p>
                              )}
                              {statusLocked && (
                                <p className="text-xs text-orange-600 mt-1">
                                  Không thể chỉnh sửa chuyến đang ở trạng thái {trip.status}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chọn xe</Label>
                  <Select
                    value={selectedVehicleId}
                    onValueChange={(value) => {
                      setSelectedVehicleId(value);
                      setSelectedDriverId('none');
                    }}
                    disabled={isEditing || editingGroupLocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chưa phân xe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chưa phân xe</SelectItem>
                      {availableVehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} ({vehicle.licensePlate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chọn tài xế</Label>
                  <Select
                    value={selectedDriverId}
                    onValueChange={(value) => setSelectedDriverId(value)}
                    disabled={isEditing || selectedVehicleId === 'none' || editingGroupLocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chưa phân tài xế" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chưa phân tài xế</SelectItem>
                      {availableDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVehicleId !== 'none' && availableDrivers.length === 0 && (
                    <p className="flex items-center gap-2 text-xs text-orange-600">
                      <AlertTriangle size={12} />
                      Không có tài xế phù hợp cho xe này
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border bg-gray-50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Số chuyến</p>
                  <p className="mt-1 text-xl font-semibold text-blue-600">{selectedTripIds.length}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tổng hành khách</p>
                  <p className="mt-1 text-xl font-semibold text-purple-600">{totalPassengers}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                  <p className="mt-1 text-xl font-semibold text-green-600">
                    {(totalRevenue / 1_000_000).toFixed(2)}M ₫
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isEditing}>
                  Hủy
                </Button>
                <Button onClick={handleSave} disabled={isEditing || editingGroupLocked} className="gap-2">
                  {isEditing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupTrips;