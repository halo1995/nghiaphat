import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTrips } from '@/data/trips';
import { Calendar, MapPin, Users, Clock, ArrowRight, CheckCircle, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { DatePickerField } from '@/components/ui/date-picker-field';

const DriverDashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const driverId = user?.id ? user.id.toString() : '';

  const { data: allTrips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
    enabled: isAuthenticated && !authLoading,
  });

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

  const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

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
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Lịch Trình Của Tôi</h1>
          <p className="text-sm text-muted-foreground">Xem và quản lý các chuyến đi được phân công</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Tổng chuyến</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Sắp đi</p>
                <p className="text-3xl font-bold text-purple-600">{stats.upcoming}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Đang chạy</p>
                <p className="text-3xl font-bold text-green-600">{stats.inProgress}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Hoàn thành</p>
                <p className="text-3xl font-bold text-gray-600">{stats.completed}</p>
              </CardContent>
            </Card>
          </div>

          {/* Date Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Calendar className="text-gray-600" size={20} />
                <div className="max-w-xs w-full">
                  <DatePickerField
                    value={selectedDate}
                    onChange={setSelectedDate}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Hiển thị {sortedTrips.length} chuyến trong ngày
                </p>
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
              {sortedTrips.map((trip, index) => (
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

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users size={16} />
                            {trip.passengers} người
                          </span>
                          <span>📏 {trip.distance} km</span>
                          <span className="font-semibold text-gray-800">{trip.customerName}</span>
                          <span>{trip.customerPhone}</span>
                          <span className="flex items-center gap-1 text-amber-600 font-semibold">
                            <Wallet size={16} />
                            Thu khách: {formatCurrency(trip.price)}
                          </span>
                        </div>

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
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;