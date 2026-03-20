import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createTrip } from '@/data/trips';
import { getCustomers, Customer } from '@/data/customers';
import { ArrowLeft, Calendar as CalendarIcon, Plus, Phone, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { getProvinces, getWards, formatFullAddress, AddressSelection } from '@/data/locations';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';

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
  fullVehicle: boolean;
};

const FULL_VEHICLE_PRICE = 550000;

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
    fullVehicle: false,
  });
  const [previousPrice, setPreviousPrice] = useState<number>(200000);
  const [pickupSelection, setPickupSelection] = useState<AddressSelection>({});
  const [dropoffSelection, setDropoffSelection] = useState<AddressSelection>({});
  const [pickupPickerOpen, setPickupPickerOpen] = useState(false);
  const [pickupWardOpen, setPickupWardOpen] = useState(false);
  const [dropoffWardOpen, setDropoffWardOpen] = useState(false);
  const [customerPhoneOpen, setCustomerPhoneOpen] = useState(false);
  const [customerPhoneSearch, setCustomerPhoneSearch] = useState('');

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    staleTime: 5 * 60 * 1000,
  });

  const filteredCustomers = useMemo(() => {
    if (!customerPhoneSearch || customerPhoneSearch.length < 2) return [];
    const q = customerPhoneSearch.toLowerCase();
    return allCustomers
      .filter((c: Customer) => c.phone.includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [allCustomers, customerPhoneSearch]);

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
        fullVehicle: data.fullVehicle,
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
    setFormData(prev => {
      if (field === 'price' && typeof value === 'number' && !prev.fullVehicle) {
        setPreviousPrice(value);
      }
      return { ...prev, [field]: value };
    });
  };

  const handleToggleFullVehicle = (checked: boolean) => {
    setFormData(prev => {
      if (checked) {
        setPreviousPrice(prev.fullVehicle ? previousPrice : prev.price);
        return {
          ...prev,
          fullVehicle: true,
          price: FULL_VEHICLE_PRICE,
        };
      }
      return {
        ...prev,
        fullVehicle: false,
        price: previousPrice > 0 ? previousPrice : 200000,
      };
    });
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

  const vietnameseFilter = (value: string, search: string) => {
    const normalize = (str: string) => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
    };
    const s = normalize(search);
    const v = normalize(value);
    return v.includes(s) ? 1 : 0;
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
                      <Popover open={customerPhoneOpen} onOpenChange={setCustomerPhoneOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                          >
                            {formData.customerPhone || 'Nhập SĐT hoặc chọn khách cũ'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Nhập SĐT hoặc tên khách hàng..."
                              value={customerPhoneSearch}
                              onValueChange={(v) => {
                                setCustomerPhoneSearch(v);
                                handleChange('customerPhone', v);
                              }}
                            />
                            <CommandList>
                              {filteredCustomers.length === 0 && customerPhoneSearch.length >= 2 && (
                                <CommandEmpty>Không tìm thấy KH. Sẽ tạo mới.</CommandEmpty>
                              )}
                              {filteredCustomers.length > 0 && (
                                <CommandGroup heading="Khách hàng cũ">
                                  {filteredCustomers.map((c: Customer) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.phone}
                                      onSelect={() => {
                                        handleChange('customerPhone', c.phone);
                                        handleChange('customerName', c.name);
                                        setCustomerPhoneSearch(c.phone);
                                        setCustomerPhoneOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          formData.customerPhone === c.phone ? 'opacity-100' : 'opacity-0'
                                        }`}
                                      />
                                      <div>
                                        <p className="font-medium">{c.name}</p>
                                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {!formData.fullVehicle && (
                      <div className="space-y-2 rounded-lg border-2 border-sky-400 bg-sky-50 p-3">
                        <Label htmlFor="passengers" className="text-sky-700 font-semibold">
                          Số hành khách *
                        </Label>
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
                    )}

                    <div className="md:col-span-2">
                      <div className={`flex items-start gap-3 rounded-lg border ${formData.fullVehicle ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'} p-3`}>
                        <Checkbox
                          id="fullVehicle"
                          checked={formData.fullVehicle}
                          onCheckedChange={(value) => handleToggleFullVehicle(value === true)}
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="fullVehicle" className={`font-semibold ${formData.fullVehicle ? 'text-green-700' : 'text-gray-800'}`}>
                            Thuê nguyên xe
                          </Label>

                        </div>
                      </div>
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
                        <Popover open={pickupWardOpen} onOpenChange={setPickupWardOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={!pickupSelection.province}
                              className="w-full justify-between"
                            >
                              {pickupSelection.ward
                                ? `${pickupSelection.ward.name}${pickupSelection.district?.name ? ` (${pickupSelection.district.name})` : ''}`
                                : 'Chọn phường/xã'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command filter={vietnameseFilter}>
                              <CommandInput
                                placeholder="Tìm kiếm phường/xã, quận/huyện..."
                              />
                              <CommandList>
                                <CommandEmpty>Không tìm thấy kết quả</CommandEmpty>
                                <CommandGroup>
                                  {pickupWardOptions
                                    .filter(option => option.code)
                                    .map(option => {
                                      const displayText = `${option.name}${option.district?.name ? ` (${option.district.name})` : ''}`;
                                      return (
                                        <CommandItem
                                          key={option.code}
                                          value={displayText}
                                          onSelect={() => {
                                            handlePickupWardChange(option.code);
                                            setPickupWardOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${pickupSelection.ward?.code === option.code
                                              ? 'opacity-100'
                                              : 'opacity-0'
                                              }`}
                                          />
                                          {displayText}
                                        </CommandItem>
                                      );
                                    })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
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
                        <Popover open={dropoffWardOpen} onOpenChange={setDropoffWardOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={!dropoffSelection.province}
                              className="w-full justify-between"
                            >
                              {dropoffSelection.ward
                                ? `${dropoffSelection.ward.name}${dropoffSelection.district?.name ? ` (${dropoffSelection.district.name})` : ''}`
                                : 'Chọn phường/xã'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command filter={vietnameseFilter}>
                              <CommandInput placeholder="Tìm kiếm phường/xã, quận/huyện..." />
                              <CommandList>
                                <CommandEmpty>Không tìm thấy kết quả</CommandEmpty>
                                <CommandGroup>
                                  {dropoffWardOptions
                                    .filter(option => option.code)
                                    .map(option => {
                                      const displayText = `${option.name}${option.district?.name ? ` (${option.district.name})` : ''}`;
                                      return (
                                        <CommandItem
                                          key={option.code}
                                          value={displayText}
                                          onSelect={() => {
                                            handleDropoffWardChange(option.code);
                                            setDropoffWardOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${dropoffSelection.ward?.code === option.code
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                              }`}
                                          />
                                          {displayText}
                                        </CommandItem>
                                      );
                                    })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
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
                          onChange={(e) =>
                            handleChange('price', Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10))
                          }
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
      </main >
    </div >
  );
};

export default CreateBooking;