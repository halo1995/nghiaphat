import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getVehicleById, deleteVehicle } from '@/data/vehicles';
import { ArrowLeft, Edit, Trash2, Fuel, Gauge, Calendar, Users, Star, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => getVehicleById(id!),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: "Đã xóa xe",
        description: "Xe đã được xóa thành công",
      });
      navigate('/vehicles');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa xe này?')) {
      deleteMutation.mutate(id!);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Không tìm thấy xe</p>
        <Link to="/vehicles">
          <Button>Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'Sẵn sàng': 'text-green-600',
    'Đang chạy': 'text-blue-600',
    'Bảo trì': 'text-orange-600',
    'Ngừng hoạt động': 'text-gray-600',
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{vehicle.name}</h1>
          <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
        </div>
        <Link to={`/edit-vehicle/${vehicle.id}`}>
          <Button variant="outline" className="gap-2">
            <Edit size={16} />
            Chỉnh sửa
          </Button>
        </Link>
        <Button variant="destructive" className="gap-2" onClick={handleDelete}>
          <Trash2 size={16} />
          Xóa
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-5xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="overflow-hidden">
              <img
                src={vehicle.image}
                alt={vehicle.name}
                className="w-full h-96 object-cover"
              />
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Thông Tin Cơ Bản</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hãng xe:</span>
                    <span className="font-semibold">{vehicle.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dòng xe:</span>
                    <span className="font-semibold">{vehicle.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Năm sản xuất:</span>
                    <span className="font-semibold">{vehicle.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Màu sắc:</span>
                    <span className="font-semibold">{vehicle.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Biển số:</span>
                    <span className="font-semibold text-blue-600">{vehicle.licensePlate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số chỗ ngồi:</span>
                    <span className="font-semibold flex items-center gap-1">
                      <Users size={16} />
                      {vehicle.seats} chỗ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <span className={`font-semibold ${statusColors[vehicle.status]}`}>
                      {vehicle.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Thông Số & Hiệu Suất</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Fuel size={18} />
                      Nhiên liệu:
                    </span>
                    <span className="font-semibold">{vehicle.fuelType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Gauge size={18} />
                      Số km đã đi:
                    </span>
                    <span className="font-semibold">{vehicle.mileage.toLocaleString()} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <TrendingUp size={18} />
                      Tổng chuyến:
                    </span>
                    <span className="font-semibold text-blue-600">{vehicle.totalTrips}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Star size={18} />
                      Đánh giá:
                    </span>
                    <span className="font-semibold text-yellow-600 flex items-center gap-1">
                      <Star className="fill-yellow-400 text-yellow-400" size={16} />
                      {vehicle.rating}/5
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar size={18} />
                      Bảo trì lần cuối:
                    </span>
                    <span className="font-semibold">
                      {new Date(vehicle.lastMaintenance).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar size={18} />
                      Bảo trì tiếp theo:
                    </span>
                    <span className="font-semibold">
                      {new Date(vehicle.nextMaintenance).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default VehicleDetail;