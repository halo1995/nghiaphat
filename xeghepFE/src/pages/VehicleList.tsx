import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVehicles } from '@/hooks/useApi';
import { Search, Fuel, Gauge, Users, Star, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const VehicleList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  
  const { data: vehiclesData, isLoading } = useVehicles(searchTerm);
  const vehicles = vehiclesData?.content || [];

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    'Sẵn sàng': 'bg-green-500 text-white',
    'Đang chạy': 'bg-blue-500 text-white',
    'Bảo trì': 'bg-orange-500 text-white',
    'Ngừng hoạt động': 'bg-gray-500 text-white',
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Quản Lý Xe</h1>
          <p className="text-sm text-muted-foreground">Danh sách xe trong hệ thống</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Search & Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-col gap-3 md:flex-row md:items-center flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="text"
                      placeholder="Tìm kiếm theo tên, hãng hoặc biển số..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="md:w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Lọc trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="Sẵn sàng">Sẵn sàng</SelectItem>
                        <SelectItem value="Đang chạy">Đang chạy</SelectItem>
                        <SelectItem value="Bảo trì">Bảo trì</SelectItem>
                        <SelectItem value="Ngừng hoạt động">Ngừng hoạt động</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="gap-2 md:self-stretch" onClick={() => navigate('/add-vehicle')}>
                  <Plus size={18} />
                  Thêm xe
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Không tìm thấy xe nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/vehicle/${vehicle.id}`}>
                    <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-2 group">
                      <div className="relative overflow-hidden">
                        <img
                          src={vehicle.image}
                          alt={vehicle.name}
                          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute top-3 right-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[vehicle.status]}`}>
                            {vehicle.status}
                          </span>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {vehicle.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {vehicle.brand} {vehicle.model} • {vehicle.year}
                        </p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Biển số:</span>
                            <span className="font-semibold text-blue-600">{vehicle.licensePlate}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Users size={14} /> Số chỗ:
                            </span>
                            <span className="font-medium">{vehicle.seats} chỗ</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Fuel size={14} /> Nhiên liệu:
                            </span>
                            <span className="font-medium">{vehicle.fuelType}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Gauge size={14} /> Km đã đi:
                            </span>
                            <span className="font-medium">{vehicle.mileage.toLocaleString()} km</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Đánh giá</p>
                            <p className="flex items-center gap-1 font-bold text-yellow-600">
                              <Star className="fill-yellow-400 text-yellow-400" size={14} />
                              {vehicle.rating}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Chuyến đi</p>
                            <p className="font-bold text-blue-600">{vehicle.totalTrips}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VehicleList;