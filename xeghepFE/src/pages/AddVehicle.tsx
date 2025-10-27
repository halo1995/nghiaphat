import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addVehicle, type VehiclePayload } from '@/data/vehicles';
import { ArrowLeft, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DatePickerField } from '@/components/ui/date-picker-field';

const AddVehicle = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<VehiclePayload>({
    name: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    color: '',
    seats: 4,
    fuelType: 'Xăng' as 'Xăng' | 'Dầu' | 'Điện' | 'Hybrid',
    status: 'Sẵn sàng' as 'Sẵn sàng' | 'Đang chạy' | 'Bảo trì' | 'Ngừng hoạt động',
    mileage: 0,
    lastMaintenance: '',
    nextMaintenance: '',
    image: '',
  });

  const addMutation = useMutation({
    mutationFn: addVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: "Đã thêm xe",
        description: "Xe mới đã được thêm thành công",
      });
      navigate('/vehicles');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting vehicle:', formData);
    addMutation.mutate(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Thêm Xe Mới</h1>
          <p className="text-sm text-muted-foreground">Nhập thông tin xe mới</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Thông Tin Xe</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên xe *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="VD: Toyota Innova"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand">Hãng xe *</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => handleChange('brand', e.target.value)}
                      placeholder="VD: Toyota"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Dòng xe *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => handleChange('model', e.target.value)}
                      placeholder="VD: Innova 2.0E"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Năm sản xuất *</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => handleChange('year', parseInt(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">Biển số *</Label>
                    <Input
                      id="licensePlate"
                      value={formData.licensePlate}
                      onChange={(e) => handleChange('licensePlate', e.target.value)}
                      placeholder="VD: 30A-12345"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Màu sắc *</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => handleChange('color', e.target.value)}
                      placeholder="VD: Trắng"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seats">Số chỗ ngồi *</Label>
                    <Input
                      id="seats"
                      type="number"
                      min="2"
                      max="50"
                      value={formData.seats}
                      onChange={(e) => handleChange('seats', parseInt(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Loại nhiên liệu *</Label>
                    <Select value={formData.fuelType} onValueChange={(value) => handleChange('fuelType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Xăng">Xăng</SelectItem>
                        <SelectItem value="Dầu">Dầu</SelectItem>
                        <SelectItem value="Điện">Điện</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Trạng thái *</Label>
                    <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sẵn sàng">Sẵn sàng</SelectItem>
                        <SelectItem value="Đang chạy">Đang chạy</SelectItem>
                        <SelectItem value="Bảo trì">Bảo trì</SelectItem>
                        <SelectItem value="Ngừng hoạt động">Ngừng hoạt động</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mileage">Số km đã đi *</Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={formData.mileage}
                      onChange={(e) => handleChange('mileage', parseInt(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastMaintenance">Bảo trì lần cuối *</Label>
                    <DatePickerField
                      id="lastMaintenance"
                      value={formData.lastMaintenance}
                      onChange={(value) => handleChange('lastMaintenance', value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nextMaintenance">Bảo trì tiếp theo *</Label>
                    <DatePickerField
                      id="nextMaintenance"
                      value={formData.nextMaintenance}
                      onChange={(value) => handleChange('nextMaintenance', value)}
                      required
                    />
                  </div>

                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">URL hình ảnh *</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => handleChange('image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1 gap-2 bg-green-600 hover:bg-green-700" disabled={addMutation.isPending}>
                    <Plus size={20} />
                    {addMutation.isPending ? 'Đang thêm...' : 'Thêm Xe'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/vehicles')}>
                    Hủy
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AddVehicle;