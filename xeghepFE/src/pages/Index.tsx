import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVehicles, useDrivers } from '@/hooks/useApi';
import { getTrips, getTripGroups, type Trip, type TripGroup } from '@/data/trips';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Car,
  Route,
  Users,
  UserCircle,
  TrendingUp,
  Clock,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const getTodayLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const Index = () => {
  const defaultDate = useMemo(() => getTodayLocalDate(), []);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles();
  const { data: driversData, isLoading: driversLoading } = useDrivers();
  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['dashboard-trips', defaultDate],
    queryFn: () => getTrips(defaultDate),
    enabled: isAuthenticated && !authLoading,
  });
  const { data: tripGroups = [], isLoading: groupsLoading } = useQuery<TripGroup[]>({
    queryKey: ['dashboard-trip-groups', defaultDate],
    queryFn: () => getTripGroups(defaultDate),
    enabled: isAuthenticated && !authLoading,
  });

  const vehicles = vehiclesData?.content ?? [];
  const drivers = driversData?.content ?? [];

  const stats = useMemo(() => {
    const normalize = (value: unknown) =>
      value
        ? value
          .toString()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
        : '';

    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter((vehicle: any) => {
      const status = normalize(vehicle.statusCode ?? vehicle.status);
      return status === 'SAN SANG' || status === 'SAN_SANG';
    }).length;

    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter((driver: any) => {
      const status = normalize(driver.statusCode ?? driver.status);
      return status === 'HOAT DONG' || status === 'HOAT_DONG';
    }).length;

    return { totalVehicles, availableVehicles, totalDrivers, activeDrivers };
  }, [vehicles, drivers]);

  const parseDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const todayKey = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const pendingTrips = trips.filter((trip) => ['Chờ xác nhận', 'Đã xác nhận'].includes(trip.status));
  const inProgressTrips = trips.filter((trip) => ['Đã phân xe', 'Đang đón', 'Đang đi'].includes(trip.status));
  const completedTrips = trips.filter((trip) => trip.status === 'Hoàn thành');
  const cancelledTrips = trips.filter((trip) => trip.status === 'Đã hủy');

  const totalRevenue = completedTrips.reduce((sum, trip) => sum + (trip.price ?? 0), 0);
  const todaysTrips = trips.filter((trip) => trip.pickupTime?.slice(0, 10) === todayKey);
  const todaysPassengers = todaysTrips.reduce((sum, trip) => sum + (trip.passengers ?? 0), 0);

  const upcomingTrips = useMemo(() => {
    return trips
      .filter((trip) => {
        const pickup = parseDate(trip.pickupTime);
        return pickup && pickup >= now;
      })
      .sort((a, b) => {
        const timeA = parseDate(a.pickupTime)?.getTime() ?? 0;
        const timeB = parseDate(b.pickupTime)?.getTime() ?? 0;
        return timeA - timeB;
      })
      .slice(0, 5);
  }, [trips, now]);

  const recentTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => {
        const createdA = parseDate(a.createdAt)?.getTime() ?? 0;
        const createdB = parseDate(b.createdAt)?.getTime() ?? 0;
        return createdB - createdA;
      })
      .slice(0, 5);
  }, [trips]);

  const liveGroups = useMemo(() => {
    return tripGroups
      .filter((group) => group.status !== 'Hoàn thành')
      .sort((a, b) => {
        const createdA = parseDate(a.createdAt)?.getTime() ?? 0;
        const createdB = parseDate(b.createdAt)?.getTime() ?? 0;
        return createdB - createdA;
      })
      .slice(0, 4);
  }, [tripGroups]);

  const tripsById = useMemo(() => new Map(trips.map((trip) => [trip.id, trip])), [trips]);

  const loading = vehiclesLoading || driversLoading || tripsLoading || groupsLoading;
  const ready = !loading;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  const formatDateTime = (value?: string) => {
    const date = parseDate(value);
    if (!date) return '—';
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const statusStyles: Record<Trip['status'], string> = {
    'Chờ xác nhận': 'bg-yellow-100 text-yellow-700',
    'Đã xác nhận': 'bg-blue-100 text-blue-700',
    'Đã ghép chuyến': 'bg-indigo-100 text-indigo-700',
    'Đã phân xe': 'bg-teal-100 text-teal-700',
    'Đang đón': 'bg-orange-100 text-orange-700',
    'Đang đi': 'bg-purple-100 text-purple-700',
    'Hoàn thành': 'bg-emerald-100 text-emerald-700',
    'Đã hủy': 'bg-red-100 text-red-700',
  };

  const statCards = [
    {
      title: 'Tổng số chuyến',
      value: ready ? trips.length.toString() : '—',
      description: 'Tất cả các chuyến trong hệ thống',
      icon: Route,
      color: 'from-sky-500 to-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      title: 'Đang xử lý',
      value: ready ? (pendingTrips.length + inProgressTrips.length).toString() : '—',
      description: 'Chờ xác nhận & đang thực hiện',
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Hoàn thành',
      value: ready ? completedTrips.length.toString() : '—',
      description: `${ready ? cancelledTrips.length : '—'} chuyến đã hủy`,
      icon: Users,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Doanh thu hoàn thành',
      value: ready ? formatCurrency(totalRevenue) : '—',
      description: 'Từ các chuyến đã hoàn thành',
      icon: TrendingUp,
      color: 'from-fuchsia-500 to-fuchsia-600',
      bgColor: 'bg-fuchsia-50',
    },
    {
      title: 'Xe sẵn sàng',
      value: ready ? `${stats.availableVehicles}/${stats.totalVehicles}` : '—',
      description: 'Xe có thể nhận chuyến ngay',
      icon: Car,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Tài xế hoạt động',
      value: ready ? `${stats.activeDrivers}/${stats.totalDrivers}` : '—',
      description: 'Tài xế đang trong ca',
      icon: UserCircle,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tổng Quan</h1>
          <p className="text-sm text-muted-foreground">Hệ thống điều phối xe đưa đón</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.description}</p>
                      </div>
                      <div className={`${stat.bgColor} p-3 rounded-xl`}>
                        <stat.icon className={`h-8 w-8 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Analytics Charts */}
          {ready && trips.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ Trạng thái</CardTitle>
                  <p className="text-sm text-muted-foreground">Tỷ lệ chuyến theo trạng thái hôm nay</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Chờ xử lý', value: pendingTrips.length },
                          { name: 'Đang thực hiện', value: inProgressTrips.length },
                          { name: 'Hoàn thành', value: completedTrips.length },
                          { name: 'Đã hủy', value: cancelledTrips.length },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {['#f59e0b', '#8b5cf6', '#10b981', '#ef4444'].map((color, idx) => (
                          <Cell key={idx} fill={color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Doanh thu theo Trạng thái</CardTitle>
                  <p className="text-sm text-muted-foreground">Tổng tiền (VNĐ) phân theo loại</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={[
                      { name: 'Hoàn thành', revenue: completedTrips.reduce((s, t) => s + (t.price ?? 0), 0) },
                      { name: 'Đang đi', revenue: inProgressTrips.reduce((s, t) => s + (t.price ?? 0), 0) },
                      { name: 'Chờ xử lý', revenue: pendingTrips.reduce((s, t) => s + (t.price ?? 0), 0) },
                      { name: 'Đã hủy', revenue: cancelledTrips.reduce((s, t) => s + (t.price ?? 0), 0) },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Hoạt động trong ngày</CardTitle>
                  <p className="text-sm text-muted-foreground">Tổng quan ngày {new Date().toLocaleDateString('vi-VN')}</p>
                </div>
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 bg-white">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Chuyến hôm nay</p>
                    <p className="text-2xl font-semibold text-gray-900">{ready ? todaysTrips.length : '—'}</p>
                    <p className="text-xs text-muted-foreground">{ready ? `${todaysPassengers} hành khách` : 'Đang tải dữ liệu'}</p>
                  </div>
                  <div className="rounded-lg border p-4 bg-white">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Đang thực hiện</p>
                    <p className="text-2xl font-semibold text-gray-900">{ready ? inProgressTrips.length : '—'}</p>
                    <p className="text-xs text-muted-foreground">Đang đón & đang di chuyển</p>
                  </div>
                  <div className="rounded-lg border p-4 bg-white">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Đang chờ xử lý</p>
                    <p className="text-2xl font-semibold text-gray-900">{ready ? pendingTrips.length : '—'}</p>
                    <p className="text-xs text-muted-foreground">Chờ xác nhận & phân xe</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thao tác nhanh</CardTitle>
                <p className="text-sm text-muted-foreground">Tăng tốc các tác vụ quản trị phổ biến</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/create-booking">
                  <Button className="w-full justify-between">
                    Tạo chuyến mới
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/dispatch">
                  <Button variant="outline" className="w-full justify-between">
                    Điều phối ngay
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/drivers/add">
                  <Button variant="outline" className="w-full justify-between">
                    Thêm tài xế
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/vehicles">
                  <Button variant="outline" className="w-full justify-between">
                    Kiểm tra đội xe
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Chuyến sắp diễn ra</CardTitle>
                  <p className="text-sm text-muted-foreground">Top 5 chuyến có giờ đón gần nhất</p>
                </div>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {!ready ? (
                  <p className="text-sm text-muted-foreground">Đang tải dữ liệu chuyến đi...</p>
                ) : upcomingTrips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không có chuyến nào trong thời gian tới.</p>
                ) : (
                  <ul className="divide-y">
                    {upcomingTrips.map((trip) => (
                      <li key={trip.id} className="py-3 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {trip.pickupLocation} → {trip.dropoffLocation}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(trip.pickupTime)} • {trip.customerName}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{trip.fullVehicle ? 'Thuê nguyên xe' : `${trip.passengers} hành khách`}</p>
                          <p>{trip.driverName ?? 'Chưa phân tài xế'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nhóm chuyến đang hoạt động</CardTitle>
                <p className="text-sm text-muted-foreground">Theo dõi các nhóm chưa hoàn thành</p>
              </CardHeader>
              <CardContent>
                {!ready ? (
                  <p className="text-sm text-muted-foreground">Đang tải dữ liệu nhóm chuyến...</p>
                ) : liveGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có nhóm chuyến nào đang hoạt động.</p>
                ) : (
                  <ul className="space-y-3">
                    {liveGroups.map((group) => (
                      <li key={group.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-gray-900">{group.name}</p>
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                            {group.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {group.tripIds.some((id) => tripsById.get(id)?.fullVehicle)
                            ? 'Thuê nguyên xe'
                            : `${group.totalPassengers} khách`} • {formatCurrency(group.totalRevenue)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tạo lúc {formatDateTime(group.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hoạt động mới nhất</CardTitle>
              <p className="text-sm text-muted-foreground">Những thay đổi vừa được ghi nhận</p>
            </CardHeader>
            <CardContent>
              {!ready ? (
                <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
              ) : recentTrips.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu chuyến đi.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-4">Khách hàng</th>
                        <th className="py-2 pr-4">Lộ trình</th>
                        <th className="py-2 pr-4">Thời gian</th>
                        <th className="py-2 pr-4">Giá</th>
                        <th className="py-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTrips.map((trip) => (
                        <tr key={trip.id} className="border-t">
                          <td className="py-2 pr-4 font-medium text-gray-900">{trip.customerName}</td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {trip.pickupLocation} → {trip.dropoffLocation}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{formatDateTime(trip.createdAt)}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{formatCurrency(trip.price ?? 0)}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyles[trip.status]}`}>
                              {trip.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;