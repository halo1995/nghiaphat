import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createTrip } from '@/data/trips';
import { ArrowLeft, Calendar as CalendarIcon, Plus, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { getProvinces, getWards, formatFullAddress, AddressSelection } from '@/data/locations';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type BookingFormData = {
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  pickupProvinceCode: string;
  pickupWardCode: string;
  dropoffLocation: string;
  dropoffProvinceCode: string;
  dropoffWardCode: string;
  pickupTime: string;
  distance: number;
  price: number;
  passengers: number;
  notes: string;
};

const CreateBooking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [formData, setFormData] = useState<BookingFormData>({
    customerName: '',
    customerPhone: '',
    pickupLocation: '',
    pickupProvinceCode: '',
    pickupWardCode: '',
    dropoffLocation: '',
    dropoffProvinceCode: '',
    dropoffWardCode: '',
    pickupTime: '',
    distance: 0,
    price: 200000,
    passengers: 1,
    notes: '',
  });
  const [pickupSelection, setPickupSelection] = useState<AddressSelection>({});
  const [dropoffSelection, setDropoffSelection] = useState<AddressSelection>({});
  const [pickupPickerOpen, setPickupPickerOpen] = useState(false);

  const provinceOptions = useMemo(() => getProvinces(), []);
  const pickupProvinceCode = pickupSelection.province?.code;
  const dropoffProvinceCode = dropoffSelection.province?.code;

  const pickupWardOptions = useMemo(
    () => (pickupProvinceCode ? getWards(pickupProvinceCode) : []),
    [pickupProvinceCode]
  );
  const dropoffWardOptions = useMemo(
    () => (dropoffProvinceCode ? getWards(dropoffProvinceCode) : []),
    [dropoffProvinceCode]
  );

  const createMutation = useMutation({
    mutationFn: (data: BookingFormData) =>
      createTrip({
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        pickupLocation: data.pickupLocation,
        pickupProvinceCode: data.pickupProvinceCode || undefined,
        pickupWardCode: data.pickupWardCode || undefined,
        dropoffLocation: data.dropoffLocation,
        dropoffProvinceCode: data.dropoffProvinceCode || undefined,
        dropoffWardCode: data.dropoffWardCode || undefined,
        pickupTime: data.pickupTime,
        dropoffTime: undefined,
        distance: data.distance,
        price: data.price,
        passengers: data.passengers,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast({
        title: "Đã tạo đặt chuyến",
        description: "Đặt chuyến mới đã được tạo, vui lòng gọi xác nhận với khách hàng",
      });
      navigate('/call-center');
    },
    onError: (error) => {
      toast({
        title: 'Không thể tạo đặt chuyến',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
        variant: 'destructive',
      });
    },
  });

  const updatePickupSelection = (updater: (prev: AddressSelection) => AddressSelection) => {
    setPickupSelection(prev => {
      const next = updater(prev);
      const formatted = formatFullAddress(next) ?? '';
      setFormData(current => ({
        ...current,
        pickupLocation: formatted,
        pickupProvinceCode: next.province?.code ?? '',
        pickupWardCode: next.ward?.code ?? '',
      }));
      return next;
    });
  };

  const updateDropoffSelection = (updater: (prev: AddressSelection) => AddressSelection) => {
    setDropoffSelection(prev => {
      const next = updater(prev);
      const formatted = formatFullAddress(next) ?? '';
      setFormData(current => ({
        ...current,
        dropoffLocation: formatted,
        dropoffProvinceCode: next.province?.code ?? '',
        dropoffWardCode: next.ward?.code ?? '',
      }));
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({
        title: 'Chưa đăng nhập',
        description: 'Vui lòng đăng nhập trước khi tạo đặt chuyến.',
        variant: 'destructive',
      });
      return;
    }
    if (
      !pickupSelection.province ||
      !pickupSelection.district ||
      !pickupSelection.ward ||
      !dropoffSelection.province ||
      !dropoffSelection.district ||
      !dropoffSelection.ward
    ) {
      toast({
        title: 'Thiếu thông tin địa chỉ',
        description: 'Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện và phường/xã cho cả điểm đón và điểm trả.',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleChange = <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePickupProvinceChange = (provinceCode: string) => {
    if (!provinceCode) {
      updatePickupSelection(() => ({ province: undefined, district: undefined, ward: undefined }));
      return;
    }
    const province = provinceOptions.find(option => option.code === provinceCode);
    updatePickupSelection(() => ({ province, district: undefined, ward: undefined }));
  };

  const handlePickupWardChange = (wardCode: string) => {
    if (!wardCode) {
      updatePickupSelection(prev => ({ ...prev, ward: undefined, district: undefined }));
      return;
    }
    const ward = pickupWardOptions.find(option => option.code === wardCode);
    updatePickupSelection(prev => ({ ...prev, ward, district: ward?.district }));
  };

  const handleDropoffProvinceChange = (provinceCode: string) => {
    if (!provinceCode) {
      updateDropoffSelection(() => ({ province: undefined, district: undefined, ward: undefined }));
      return;
    }
    const province = provinceOptions.find(option => option.code === provinceCode);
    updateDropoffSelection(() => ({ province, district: undefined, ward: undefined }));
  };

  const handleDropoffWardChange = (wardCode: string) => {
    if (!wardCode) {
      updateDropoffSelection(prev => ({ ...prev, ward: undefined, district: undefined }));
      return;
    }
    const ward = dropoffWardOptions.find(option => option.code === wardCode);
    updateDropoffSelection(prev => ({ ...prev, ward, district: ward?.district }));
  };

  const parseLocalDateTime = (value: string) => {
    if (!value) return undefined;
    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) return undefined;
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour = 0, minute = 0] = timePart.split(':').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1, hour, minute, 0, 0);
  };

  const formatLocalDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handlePickupDateChange = (date: Date | undefined) => {
    if (!date) return;
    setFormData(prev => {
      const current = parseLocalDateTime(prev.pickupTime) ?? new Date();
      const updated = new Date(current);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      return { ...prev, pickupTime: formatLocalDateTime(updated) };
    });
  };

  const handlePickupTimeChange = (timeValue: string) => {
    setFormData(prev => {
      if (!timeValue) {
        return { ...prev, pickupTime: '' };
      }
      const [hour = 0, minute = 0] = timeValue.split(':').map(Number);
      const current = parseLocalDateTime(prev.pickupTime) ?? new Date();
      const updated = new Date(current);
      updated.setHours(hour, minute, 0, 0);
      return { ...prev, pickupTime: formatLocalDateTime(updated) };
    });
  };

  const formatPickupLabel = (value: string) => {
    const parsed = parseLocalDateTime(value);
    if (!parsed) return 'Chọn ngày giờ đón';
    return format(parsed, "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi });
  };

  const pickupDate = parseLocalDateTime(formData.pickupTime);
  const pickupTimeValue = pickupDate ? format(pickupDate, 'HH:mm') : '';

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
          <SidebarTrigger />
          <Button variant="ghost" size="icon" onClick={() => navigate('/call-center')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tạo Đặt Chuyến Mới</h1>
            <p className="text-sm text-muted-foreground">Yêu cầu đăng nhập để tiếp tục</p>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Vui lòng đăng nhập để tạo đặt chuyến.</p>
              <Button className="mt-4" onClick={() => navigate('/login')}>
                Đến trang đăng nhập
              </Button>
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/call-center')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tạo Đặt Chuyến Mới</h1>
          <p className="text-sm text-muted-foreground">Nhập thông tin đặt chuyến từ khách hàng</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="text-green-600" />
                Thông Tin Đặt Chuyến
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Thông Tin Khách Hàng
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Tên khách hàng *</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => handleChange('customerName', e.target.value)}
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerPhone">Số điện thoại *</Label>
                      <Input
                        id="customerPhone"
                        value={formData.customerPhone}
                        onChange={(e) => handleChange('customerPhone', e.target.value)}
                        placeholder="0901234567"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="passengers">Số hành khách *</Label>
                      <Input
                        id="passengers"
                        type="number"
                        min="1"
                        max="50"
                        value={formData.passengers}
                        onChange={(e) =>
                          handleChange(
                            'passengers',
                            Number.isNaN(parseInt(e.target.value, 10)) ? 1 : Math.max(1, parseInt(e.target.value, 10))
                          )
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Route Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Thông Tin Hành Trình
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Điểm đón *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select value={pickupSelection.province?.code ?? ''} onValueChange={handlePickupProvinceChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tỉnh/thành" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinceOptions.map(option => (
                              <SelectItem key={option.code} value={option.code}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={pickupSelection.ward?.code ?? ''}
                          onValueChange={handlePickupWardChange}
                          disabled={!pickupSelection.province}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn phường/xã" />
                          </SelectTrigger>
                          <SelectContent>
                            {pickupWardOptions.map(option => (
                              <SelectItem key={option.code} value={option.code}>
                                {option.name} ({option.district.name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        value={formData.pickupLocation}
                        placeholder="Tự động hiển thị sau khi chọn khu vực"
                        readOnly
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Điểm trả *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select value={dropoffSelection.province?.code ?? ''} onValueChange={handleDropoffProvinceChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tỉnh/thành" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinceOptions.map(option => (
                              <SelectItem key={option.code} value={option.code}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={dropoffSelection.ward?.code ?? ''}
                          onValueChange={handleDropoffWardChange}
                          disabled={!dropoffSelection.province}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn phường/xã" />
                          </SelectTrigger>
                          <SelectContent>
                            {dropoffWardOptions.map(option => (
                              <SelectItem key={option.code} value={option.code}>
                                {option.name} ({option.district.name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        value={formData.dropoffLocation}
                        placeholder="Tự động hiển thị sau khi chọn khu vực"
                        readOnly
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pickupTimeButton">Thời gian đón *</Label>
                        <Popover open={pickupPickerOpen} onOpenChange={setPickupPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              id="pickupTimeButton"
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.pickupTime ? formatPickupLabel(formData.pickupTime) : (
                                <span className="text-muted-foreground">Chọn ngày giờ đón</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={pickupDate}
                              onSelect={handlePickupDateChange}
                              locale={vi}
                              initialFocus
                            />
                            <div className="border-t px-3 py-2">
                              <Label className="text-xs text-muted-foreground" htmlFor="pickupTimeInput">
                                Giờ đón
                              </Label>
                              <Input
                                id="pickupTimeInput"
                                type="time"
                                value={pickupTimeValue}
                                onChange={(e) => handlePickupTimeChange(e.target.value)}
                                className="mt-1"
                                required
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="distance">Khoảng cách (km) *</Label>
                        <Input
                          id="distance"
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.distance}
                        onChange={(e) => handleChange('distance', Number.isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price">Giá cước (VNĐ) *</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          value={formData.price}
                        onChange={(e) => handleChange('price', Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10))}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Ghi chú thêm về chuyến đi (yêu cầu đặc biệt, hành lý...)"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700" 
                    disabled={createMutation.isPending}
                  >
                    <Plus size={20} />
                    {createMutation.isPending ? 'Đang tạo...' : 'Tạo Đặt Chuyến'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/call-center')}>
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

export default CreateBooking;