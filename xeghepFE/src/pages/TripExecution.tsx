import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTripById, updateTrip } from '@/data/trips';
import { ArrowLeft, MapPin, Users, Phone, CheckCircle, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const TripExecution = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => getTripById(tripId!),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTrip(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });

  const handleStartTrip = () => {
    updateMutation.mutate({
      id: tripId!,
      data: { 
        status: 'Đang đón',
        startedAt: new Date().toISOString()
      }
    });
    toast({
      title: "Đã bắt đầu chuyến",
      description: "Hãy đến điểm đón khách",
    });
  };

  const handleConfirmPickup = () => {
    updateMutation.mutate({
      id: tripId!,
      data: { 
        status: 'Đang đi',
        pickupConfirmed: true
      }
    });
    toast({
      title: "Đã đón khách",
      description: "Bắt đầu di chuyển đến điểm trả",
    });
  };

  const handleConfirmDropoff = () => {
    updateMutation.mutate({
      id: tripId!,
      data: { 
        status: 'Hoàn thành',
        dropoffConfirmed: true,
        dropoffTime: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }
    });
    toast({
      title: "Hoàn thành chuyến",
      description: "Chuyến đi đã hoàn thành thành công",
    });
    setTimeout(() => navigate('/driver'), 1500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Không tìm thấy chuyến đi</p>
        <Button onClick={() => navigate('/driver')}>Quay lại</Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'Đã phân xe': 'bg-blue-100 text-blue-700',
    'Đang đón': 'bg-yellow-100 text-yellow-700',
    'Đang đi': 'bg-green-100 text-green-700',
    'Hoàn thành': 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <Button variant="ghost" size="icon" onClick={() => navigate('/driver')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Thực Hiện Chuyến</h1>
          <p className="text-sm text-muted-foreground">Mã chuyến: #{trip.id}</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[trip.status]}`}>
          {trip.status}
        </span>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Customer Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông Tin Khách Hàng</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{trip.customerName}</p>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <Phone size={16} />
                      {trip.customerPhone}
                    </p>
                  </div>
                  <a href={`tel:${trip.customerPhone}`}>
                    <Button className="gap-2 bg-green-600 hover:bg-green-700">
                      <Phone size={18} />
                      Gọi khách
                    </Button>
                  </a>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Số hành khách</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Users size={18} />
                    {trip.passengers} người
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Route Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Hành Trình</h3>
                
                <div className="space-y-6">
                  {/* Pickup */}
                  <div className="relative">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${
                        trip.pickupConfirmed ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <MapPin className={trip.pickupConfirmed ? 'text-green-600' : 'text-blue-600'} size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">Điểm đón</p>
                          {trip.pickupConfirmed && (
                            <span className="flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle size={16} />
                              Đã đón
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">
                          {trip.pickupLocation}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Giờ đón: {new Date(trip.pickupTime).toLocaleString('vi-VN')}
                        </p>
                        {!trip.pickupConfirmed && trip.status !== 'Đã phân xe' && (
                          <div className="flex gap-2">
                            {/* <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.pickupLocation)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm" className="gap-2">
                                <Navigation size={16} />
                                Chỉ đường
                              </Button>
                            </a> */}
                            {trip.status === 'Đang đón' && (
                              <Button 
                                onClick={handleConfirmPickup}
                                size="sm"
                                className="gap-2 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle size={16} />
                                Xác nhận đã đón
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {!trip.dropoffConfirmed && (
                      <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-300"></div>
                    )}
                  </div>

                  {/* Dropoff */}
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${
                      trip.dropoffConfirmed ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <MapPin className={trip.dropoffConfirmed ? 'text-green-600' : 'text-red-600'} size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Điểm trả</p>
                        {trip.dropoffConfirmed && (
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle size={16} />
                            Đã trả
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-3">
                        {trip.dropoffLocation}
                      </p>
                      {!trip.dropoffConfirmed && trip.pickupConfirmed && (
                        <div className="flex gap-2">
                          {/* <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.dropoffLocation)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm" className="gap-2">
                              <Navigation size={16} />
                              Chỉ đường
                            </Button>
                          </a> */}
                          {trip.status === 'Đang đi' && (
                            <Button 
                              onClick={handleConfirmDropoff}
                              size="sm"
                              className="gap-2 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle size={16} />
                              Xác nhận đã trả
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Khoảng cách</span>
                    <span className="font-semibold">{trip.distance} km</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notes */}
          {trip.notes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Ghi Chú Quan Trọng</h3>
                  <p className="text-yellow-800">{trip.notes}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Action Button */}
          {trip.status === 'Đã phân xe' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button 
                onClick={handleStartTrip}
                className="w-full h-16 text-lg gap-3 bg-green-600 hover:bg-green-700"
              >
                <Navigation size={24} />
                Bắt Đầu Chuyến Đi
              </Button>
            </motion.div>
          )}

          {trip.status === 'Hoàn thành' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="mx-auto mb-4 text-green-600" size={64} />
                  <h3 className="text-2xl font-bold text-green-900 mb-2">
                    Chuyến Đi Hoàn Thành!
                  </h3>
                  <p className="text-green-700 mb-4">
                    Cảm ơn bạn đã hoàn thành chuyến đi an toàn
                  </p>
                  <Button onClick={() => navigate('/driver')} className="gap-2">
                    Về trang chủ
                    <ArrowLeft size={16} />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TripExecution;