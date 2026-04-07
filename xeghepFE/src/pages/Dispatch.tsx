import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { getTrips, createTripGroup, updateTrip } from '@/data/trips';
import { GitMerge, MapPin, Users, Calendar, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getProvinces, getWards, WardOption } from '@/data/locations';
import { useAuth } from '@/contexts/AuthContext';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightLeft, Navigation, Clock, Truck, UserCheck, Play } from 'lucide-react';

const getTodayLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const toLocalDateKey = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const Dispatch = () => {
  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
  const [filterPickupProvince, setFilterPickupProvince] = useState('all');
  const [filterPickupWard, setFilterPickupWard] = useState('all');
  const [filterDropoffProvince, setFilterDropoffProvince] = useState('all');
  const [filterDropoffWard, setFilterDropoffWard] = useState('all');
  const defaultDate = useMemo(() => getTodayLocalDate(), []);
  const [filterDate, setFilterDate] = useState<string>(defaultDate);
  const [filterTimeRange, setFilterTimeRange] = useState('all');
  const [filterDirection, setFilterDirection] = useState<'all' | 'NB-HN' | 'HN-NB' | 'OTHER'>('all');
  const [filterActiveTab, setFilterActiveTab] = useState<'PLANNING' | 'OPERATION'>('PLANNING');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: trips = [], isLoading, error } = useQuery({
    queryKey: ['trips', filterDate],
    queryFn: () => getTrips(filterDate),
    enabled: isAuthenticated && !authLoading,
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });

  console.log('Dispatch - trips:', trips);
  console.log('Dispatch - isLoading:', isLoading);
  console.log('Dispatch - error:', error);

  const createGroupMutation = useMutation({
    mutationFn: createTripGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripGroups'] });

      toast({
        title: "Đã ghép chuyến",
        description: `Đã tạo nhóm chuyến với ${selectedTrips.length} chuyến đi`,
      });

      setSelectedTrips([]);
      navigate('/group-trips', { state: { date: filterDate } });
    },
  });

  const confirmedTrips = trips.filter(t => 
    t.status === 'Đã xác nhận' || 
    t.status === 'Đang đón' || 
    t.status === 'Đang đi' ||
    t.status === 'Hoàn thành'
  );
  console.log('Dispatch - confirmedTrips:', confirmedTrips);

  const provinceOptions = useMemo(() => getProvinces(), []);
  const provinceMap = useMemo(() => new Map(provinceOptions.map(option => [option.code, option])), [provinceOptions]);

  const pickupWardOptions = useMemo(() => {
    if (filterPickupProvince === 'all') {
      return [] as WardOption[];
    }
    return getWards(filterPickupProvince);
  }, [filterPickupProvince]);

  const dropoffWardOptions = useMemo(() => {
    if (filterDropoffProvince === 'all') {
      return [] as WardOption[];
    }
    return getWards(filterDropoffProvince);
  }, [filterDropoffProvince]);

  const selectedPickupProvince = filterPickupProvince !== 'all' ? provinceMap.get(filterPickupProvince) : undefined;
  const selectedDropoffProvince = filterDropoffProvince !== 'all' ? provinceMap.get(filterDropoffProvince) : undefined;
  const selectedPickupWard = filterPickupWard !== 'all' ? pickupWardOptions.find(option => option.code === filterPickupWard) : undefined;
  const selectedDropoffWard = filterDropoffWard !== 'all' ? dropoffWardOptions.find(option => option.code === filterDropoffWard) : undefined;

  // Filter trips based on criteria
  const filteredTrips = useMemo(() => {
    return confirmedTrips.filter(trip => {
      // Direction detection (Ninh Bình: 37, Hà Nội: 01)
      const isNBtoHN = trip.pickupProvinceCode === '37' && trip.dropoffProvinceCode === '01';
      const isHNtoNB = trip.pickupProvinceCode === '01' && trip.dropoffProvinceCode === '37';
      const tripDirection = isNBtoHN ? 'NB-HN' : (isHNtoNB ? 'HN-NB' : 'OTHER');

      if (filterDirection !== 'all' && tripDirection !== filterDirection) {
        return false;
      }

      if (filterActiveTab === 'OPERATION') {
        // Show all active trips that are being picked up or on board
        return ['Đang đón', 'Đang đi', 'Hoàn thành'].includes(trip.status);
      } else {
        // Planning mode: only show confirmed trips to be grouped
        return trip.status === 'Đã xác nhận';
      }

      if (selectedPickupProvince) {
        if (trip.pickupProvinceCode !== selectedPickupProvince.code) {
          return false;
        }
      }

      if (selectedPickupWard) {
        if (trip.pickupWardCode !== selectedPickupWard.code) {
          return false;
        }
      }

      if (selectedDropoffProvince) {
        if (trip.dropoffProvinceCode !== selectedDropoffProvince.code) {
          return false;
        }
      }

      if (selectedDropoffWard) {
        if (trip.dropoffWardCode !== selectedDropoffWard.code) {
          return false;
        }
      }

      if (filterDate) {
        const tripDate = toLocalDateKey(trip.pickupTime);
        if (!tripDate || tripDate !== filterDate) {
          return false;
        }
      }

      if (filterTimeRange !== 'all') {
        if (!trip.pickupTime) return false;
        const tripHour = new Date(trip.pickupTime).getHours();
        switch (filterTimeRange) {
          case 'morning':
            if (tripHour < 6 || tripHour >= 12) return false;
            break;
          case 'afternoon':
            if (tripHour < 12 || tripHour >= 18) return false;
            break;
          case 'evening':
            if (tripHour < 18) return false;
            break;
          case 'night':
            if (tripHour >= 6) return false;
            break;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by pickup time (ascending)
      const timeA = a.pickupTime ? new Date(a.pickupTime).getTime() : 0;
      const timeB = b.pickupTime ? new Date(b.pickupTime).getTime() : 0;
      return timeA - timeB;
    });
  }, [
    confirmedTrips,
    selectedPickupProvince,
    selectedPickupWard,
    selectedDropoffProvince,
    selectedDropoffWard,
    filterDate,
    filterTimeRange,
    filterDirection,
  ]);

  // Statistics for directions
  const directionStats = useMemo(() => {
    const stats = {
      'NB-HN': { passengers: 0, count: 0 },
      'HN-NB': { passengers: 0, count: 0 },
      'OTHER': { passengers: 0, count: 0 },
    };

    confirmedTrips.forEach(trip => {
      const isNBtoHN = trip.pickupProvinceCode === '37' && trip.dropoffProvinceCode === '01';
      const isHNtoNB = trip.pickupProvinceCode === '01' && trip.dropoffProvinceCode === '37';
      const direction = isNBtoHN ? 'NB-HN' : (isHNtoNB ? 'HN-NB' : 'OTHER');

      stats[direction].passengers += trip.passengers || 0;
      stats[direction].count += 1;
    });

    return stats;
  }, [confirmedTrips]);

  const handleToggleTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip?.fullVehicle) {
      toast({
        title: 'Không thể ghép',
        description: 'Chuyến thuê nguyên xe không tham gia ghép khách.',
        variant: 'destructive'
      });
      return;
    }
    setSelectedTrips(prev =>
      prev.includes(tripId)
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  const handleCreateGroup = () => {
    if (selectedTrips.length === 0) {
      toast({
        title: "Chưa chọn chuyến",
        description: "Vui lòng chọn ít nhất 1 chuyến để ghép",
        variant: "destructive"
      });
      return;
    }

    const selectedTripData = trips.filter(t => selectedTrips.includes(t.id));
    if (selectedTripData.some(t => t.fullVehicle)) {
      toast({
        title: 'Không thể ghép chuyến',
        description: 'Vui lòng bỏ chọn chuyến thuê nguyên xe vì đã được bao trọn.',
        variant: 'destructive'
      });
      return;
    }
    const totalPassengers = selectedTripData.reduce((sum, t) => sum + t.passengers, 0);
    const totalRevenue = selectedTripData.reduce((sum, t) => sum + t.price, 0);

    const groupName = `Nhóm ${selectedTripData.length} chuyến - ${new Date().toLocaleDateString('vi-VN')}`;

    createGroupMutation.mutate({
      name: groupName,
      tripIds: selectedTrips,
      status: 'Đang ghép',
      totalPassengers,
      totalRevenue
    });
  };

  const clearFilters = () => {
    setFilterPickupProvince('all');
    setFilterPickupWard('all');
    setFilterDropoffProvince('all');
    setFilterDropoffWard('all');
    setFilterDate(defaultDate);
    setFilterTimeRange('all');
    setFilterDirection('all');
    setShowAdvancedFilters(false);
  };

  const hasActiveFilters =
    filterPickupProvince !== 'all' ||
    filterPickupWard !== 'all' ||
    filterDropoffProvince !== 'all' ||
    filterDropoffWard !== 'all' ||
    (filterDate && filterDate !== defaultDate) ||
    filterTimeRange !== 'all' ||
    filterDirection !== 'all';

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
        <p className="text-muted-foreground">Vui lòng đăng nhập để sử dụng chức năng ghép chuyến.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-800">Điều Phối - Ghép Chuyến</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-2">Có lỗi xảy ra khi tải dữ liệu</p>
              <p className="text-sm text-muted-foreground">{String(error)}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Điều Phối - Ghép Chuyến</h1>
          <p className="text-sm text-muted-foreground">Chọn các chuyến đã xác nhận để ghép thành nhóm</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Đã chọn</p>
            <p className="text-2xl font-bold text-blue-600">{selectedTrips.length}</p>
          </div>
          <Button
            onClick={handleCreateGroup}
            disabled={selectedTrips.length === 0 || createGroupMutation.isPending}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <GitMerge size={20} />
            Tạo Nhóm Chuyến
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-center mb-4">
            <Tabs value={filterActiveTab} onValueChange={(v) => setFilterActiveTab(v as any)} className="w-[400px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="PLANNING">Ghép Chuyến</TabsTrigger>
                <TabsTrigger value="OPERATION">Đang Vận Hành</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {/* Statistics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Ninh Bình → Hà Nội</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{directionStats['NB-HN'].passengers}</span>
                    <span className="text-blue-100 text-sm">khách / {directionStats['NB-HN'].count} chuyến</span>
                  </div>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <Navigation className="rotate-45" size={24} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs font-medium uppercase tracking-wider">Hà Nội → Ninh Bình</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{directionStats['HN-NB'].passengers}</span>
                    <span className="text-purple-100 text-sm">khách / {directionStats['HN-NB'].count} chuyến</span>
                  </div>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <Navigation className="rotate-[225deg]" size={24} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white border-none shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-gray-100 text-xs font-medium uppercase tracking-wider">Chiều khác</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{directionStats['OTHER'].passengers}</span>
                    <span className="text-gray-100 text-sm">khách / {directionStats['OTHER'].count} chuyến</span>
                  </div>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <ArrowRightLeft size={24} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Direction Tabs */}
          <Tabs value={filterDirection} onValueChange={(v) => setFilterDirection(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="all" className="text-sm font-semibold">Tất cả ({confirmedTrips.length})</TabsTrigger>
              <TabsTrigger value="NB-HN" className="text-sm font-semibold">NB → HN ({directionStats['NB-HN'].count})</TabsTrigger>
              <TabsTrigger value="HN-NB" className="text-sm font-semibold">HN → NB ({directionStats['HN-NB'].count})</TabsTrigger>
              <TabsTrigger value="OTHER" className="text-sm font-semibold">Khác ({directionStats['OTHER'].count})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="text-gray-600" size={20} />
                  <h3 className="font-semibold text-gray-800">Bộ Lọc Thông Minh</h3>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2 text-gray-600"
                  >
                    <X size={16} />
                    Xóa bộ lọc
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Ngày đi</Label>
                  <DatePickerField
                    id="date"
                    value={filterDate}
                    onChange={(value) => {
                      setFilterDate(value);
                      // React Query will automatically refetch when queryKey changes
                    }}
                    allowClear
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeRange">Khung giờ</Label>
                  <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
                    <SelectTrigger id="timeRange">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="morning">Sáng (6h-12h)</SelectItem>
                      <SelectItem value="afternoon">Chiều (12h-18h)</SelectItem>
                      <SelectItem value="evening">Tối (18h-24h)</SelectItem>
                      <SelectItem value="night">Đêm (0h-6h)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-transparent">Ẩn</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setShowAdvancedFilters(prev => !prev)}
                  >
                    <span>Bộ lọc nâng cao</span>
                    {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <CollapsibleContent className="mt-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pickupProvince">Tỉnh/Thành - Điểm đón</Label>
                      <Select
                        value={filterPickupProvince}
                        onValueChange={(value) => {
                          setFilterPickupProvince(value);
                          setFilterPickupWard('all');
                        }}
                      >
                        <SelectTrigger id="pickupProvince">
                          <SelectValue placeholder="Tất cả tỉnh/thành" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả tỉnh/thành</SelectItem>
                          {provinceOptions.map(option => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pickupWard">Phường/Xã - Điểm đón</Label>
                      <Select
                        value={filterPickupWard}
                        onValueChange={setFilterPickupWard}
                        disabled={filterPickupProvince === 'all'}
                      >
                        <SelectTrigger id="pickupWard">
                          <SelectValue placeholder="Tất cả phường/xã" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả phường/xã</SelectItem>
                          {pickupWardOptions.map(option => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.name} ({option.district.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dropoffProvince">Tỉnh/Thành - Điểm trả</Label>
                      <Select
                        value={filterDropoffProvince}
                        onValueChange={(value) => {
                          setFilterDropoffProvince(value);
                          setFilterDropoffWard('all');
                        }}
                      >
                        <SelectTrigger id="dropoffProvince">
                          <SelectValue placeholder="Tất cả tỉnh/thành" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả tỉnh/thành</SelectItem>
                          {provinceOptions.map(option => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dropoffWard">Phường/Xã - Điểm trả</Label>
                      <Select
                        value={filterDropoffWard}
                        onValueChange={setFilterDropoffWard}
                        disabled={filterDropoffProvince === 'all'}
                      >
                        <SelectTrigger id="dropoffWard">
                          <SelectValue placeholder="Tất cả phường/xã" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả phường/xã</SelectItem>
                          {dropoffWardOptions.map(option => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.name} ({option.district.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Đang hiển thị <span className="font-semibold text-blue-600">{filteredTrips.length}</span> chuyến
                    {selectedPickupProvince && ` • Đón: ${selectedPickupProvince.name}${selectedPickupWard ? ` - ${selectedPickupWard.name}` : ''}`}
                    {selectedDropoffProvince && ` • Trả: ${selectedDropoffProvince.name}${selectedDropoffWard ? ` - ${selectedDropoffWard.name}` : ''}`}
                    {filterDate && ` • Ngày ${new Date(filterDate).toLocaleDateString('vi-VN')}`}
                    {filterTimeRange !== 'all' && ` • ${filterTimeRange === 'morning' ? 'Sáng' :
                      filterTimeRange === 'afternoon' ? 'Chiều' :
                        filterTimeRange === 'evening' ? 'Tối' : 'Đêm'
                      }`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trips List */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <GitMerge className="mx-auto mb-4 text-gray-300" size={64} />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {hasActiveFilters ? 'Không tìm thấy chuyến phù hợp' : 'Chưa có chuyến đã xác nhận'}
                </h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? 'Thử điều chỉnh bộ lọc để tìm thêm chuyến'
                    : 'Các chuyến đã xác nhận từ tổng đài sẽ hiển thị ở đây'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTrips.map((trip) => {
                const isFullVehicle = Boolean(trip.fullVehicle);
                const pickupTimeLabel = trip.pickupTime
                  ? new Date(trip.pickupTime).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                  : 'Chưa cập nhật';

                return (
                  <Card
                    key={trip.id}
                    className={`hover:shadow-lg transition-all ${selectedTrips.includes(trip.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      } ${isFullVehicle ? 'border-green-500 bg-green-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (!isFullVehicle) {
                        handleToggleTrip(trip.id);
                      }
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedTrips.includes(trip.id)}
                          onCheckedChange={() => handleToggleTrip(trip.id)}
                          className="mt-1"
                          disabled={isFullVehicle}
                        />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">
                                {trip.customerName}
                              </h3>
                              <p className="text-sm text-muted-foreground">{trip.customerPhone}</p>
                              {isFullVehicle && (
                                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                  Thuê nguyên xe
                                </span>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                              trip.status === 'Đang đón' ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' :
                              trip.status === 'Đang đi' ? 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' :
                              trip.status === 'Hoàn thành' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                              'bg-green-100 text-green-700 border-green-200'
                            }`}>
                              {trip.status === 'Đang đón' && <Truck size={14} />}
                              {trip.status === 'Đang đi' && <Play size={14} />}
                              {trip.status === 'Hoàn thành' && <UserCheck size={14} />}
                              {trip.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-start gap-2">
                              <MapPin className="text-green-600 mt-1 flex-shrink-0" size={16} />
                              <div>
                                <p className="text-xs text-muted-foreground">Điểm đón</p>
                                <p className="text-sm font-medium text-gray-700">{trip.pickupLocation || 'Chưa cập nhật'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="text-red-600 mt-1 flex-shrink-0" size={16} />
                              <div>
                                <p className="text-xs text-muted-foreground">Điểm trả</p>
                                <p className="text-sm font-medium text-gray-700">{trip.dropoffLocation || 'Chưa cập nhật'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-200">
                              <Clock size={16} />
                              {pickupTimeLabel}
                            </span>
                            {isFullVehicle ? (
                              <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                Thuê nguyên xe
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 font-medium">
                                <Users size={14} />
                                {trip.passengers} người
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              📏 {trip.distance} km
                            </span>
                            <span className="font-bold text-green-600">
                              {trip.price.toLocaleString('vi-VN')} ₫
                            </span>
                          </div>

                          {trip.notes && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Ghi chú:</span> {trip.notes}
                              </p>
                            </div>
                          )}
                          {isFullVehicle && (
                            <p className="text-xs text-green-700 font-medium">
                              Chuyến bao nguyên xe — chỉ phân xe và tài xế, không ghép thêm khách.
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dispatch;