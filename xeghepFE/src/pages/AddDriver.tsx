import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { addDriver } from '@/data/drivers';
import type { DriverRequest } from '@/services/api';
import { ArrowLeft, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AddDriver = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  type DriverFormState = {
    username: string;
    password: string;
    name: string;
    phone: string;
    email: string;
    licenseNumber: string;
    licenseExpiry: string;
    address: string;
    dateOfBirth: string;
    joinDate: string;
    status: DriverRequest['status'];
    vehicleId: string;
  };

  const [formData, setFormData] = useState<DriverFormState>({
    username: '',
    password: '',
    name: '',
    phone: '',
    email: '',
    licenseNumber: '',
    licenseExpiry: '',
    address: '',
    dateOfBirth: '',
    joinDate: new Date().toISOString().slice(0, 10),
    status: 'HOAT_DONG',
    vehicleId: '',
  });

  const addMutation = useMutation({
    mutationFn: addDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: 'Đã thêm tài xế',
        description: 'Tài xế mới đã được thêm thành công',
      });
      navigate('/drivers');
    },
    onError: (error: unknown) => {
      toast({
        title: 'Không thể thêm tài xế',
        description: error instanceof Error ? error.message : 'Vui lòng kiểm tra lại thông tin',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedVehicleId = formData.vehicleId.trim();
    if (normalizedVehicleId && Number.isNaN(Number(normalizedVehicleId))) {
      toast({
        title: 'ID xe không hợp lệ',
        description: 'Vui lòng nhập một số hợp lệ cho ID xe',
        variant: 'destructive',
      });
      return;
    }

    addMutation.mutate({
      username: formData.username.trim(),
      password: formData.password,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      licenseNumber: formData.licenseNumber.trim(),
      licenseExpiry: formData.licenseExpiry,
      address: formData.address.trim(),
      dateOfBirth: formData.dateOfBirth,
      joinDate: formData.joinDate,
      status: formData.status,
      vehicleId: normalizedVehicleId ? Number(normalizedVehicleId) : null,
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <Button variant="ghost" size="icon" onClick={() => navigate('/drivers')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Thêm Tài Xế Mới</h1>
          <p className="text-sm text-muted-foreground">Nhập thông tin tài xế mới</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Thông Tin Tài Xế</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Tên đăng nhập *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleChange('username', e.target.value)}
                      placeholder="VD: driver.nguyenvana"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Nhập mật khẩu đăng nhập"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Họ tên *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="VD: Nguyễn Văn A"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="VD: 0901234567"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="VD: email@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Số bằng lái *</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => handleChange('licenseNumber', e.target.value)}
                      placeholder="VD: B2-123456"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseExpiry">Ngày hết hạn bằng lái *</Label>
                    <DatePickerField
                      id="licenseExpiry"
                      value={formData.licenseExpiry}
                      onChange={(value) => handleChange('licenseExpiry', value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Địa chỉ *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="VD: Quận 1, TP.HCM"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Ngày sinh *</Label>
                    <DatePickerField
                      id="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={(value) => handleChange('dateOfBirth', value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="joinDate">Ngày tham gia *</Label>
                    <DatePickerField
                      id="joinDate"
                      value={formData.joinDate}
                      onChange={(value) => handleChange('joinDate', value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Trạng thái *</Label>
                    <select
                      id="status"
                      className="border rounded-md h-9 px-3 w-full"
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value as DriverRequest['status'])}
                      required
                    >
                      <option value="HOAT_DONG">Hoạt động</option>
                      <option value="NGHI_PHEP">Nghỉ phép</option>
                      <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleId">ID xe đang lái (tùy chọn)</Label>
                  <Input
                    id="vehicleId"
                    value={formData.vehicleId}
                    onChange={(e) => handleChange('vehicleId', e.target.value)}
                    placeholder="VD: 1"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    disabled={addMutation.isPending}
                  >
                    <Plus size={20} />
                    {addMutation.isPending ? 'Đang thêm...' : 'Thêm Tài Xế'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/drivers')}>
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

export default AddDriver;
