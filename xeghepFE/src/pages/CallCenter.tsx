import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { getTrips, updateTrip, deleteTrip, type Trip } from '@/data/trips';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Plus, Phone, CheckCircle, XCircle, MapPin, Users, Calendar as CalendarIcon, Clock, Wallet, MoreHorizontal, FileText, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { getProvinces, getWards, type ProvinceOption, type WardOption } from '@/data/locations';
import { useAuth } from '@/contexts/AuthContext';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { createCustomerAdvance, getCustomerAdvances, type CustomerAdvanceMethod, type CustomerAdvancePayment, type CustomerAdvanceStatus } from '@/data/accounting';
import { compressImages, MAX_VOUCHER_IMAGES } from '@/utils/imageCompression';

const getTodayLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const customerAdvanceStatusLabels: Record<CustomerAdvanceStatus, string> = {
  pending: 'Chờ đối soát',
  submitted: 'Đã gửi kế toán',
  reconciled: 'Đã đối soát',
  rejected: 'Từ chối',
};

const customerAdvanceStatusVariants: Record<CustomerAdvanceStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  pending: 'outline',
  submitted: 'secondary',
  reconciled: 'default',
  rejected: 'destructive',
};

const methodLabels: Record<CustomerAdvanceMethod, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
};

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const CallCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(() => getTodayLocalDate());
  const [pickupTimeOrder, setPickupTimeOrder] = useState<'none' | 'soonest' | 'latest'>('none');
  const [pickupTimeRange, setPickupTimeRange] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');
  const [pickupLocationFilter, setPickupLocationFilter] = useState('');
  const [dropoffLocationFilter, setDropoffLocationFilter] = useState('');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    pickupLocation: '',
    pickupProvinceCode: '',
    pickupWardCode: '',
    dropoffLocation: '',
    dropoffProvinceCode: '',
    dropoffWardCode: '',
    passengers: '',
    price: '',
    pickupTime: '',
    dropoffTime: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const role = user?.role ? user.role.toString().toLowerCase() : undefined;
  const allowCustomerFinance = role === 'call_center' || role === 'admin';

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips', dateFilter],
    queryFn: () => getTrips(dateFilter),
    enabled: isAuthenticated && !authLoading,
  });

  const customerAdvancesQuery = useQuery({
    queryKey: ['customer-advances', allowCustomerFinance],
    queryFn: () => getCustomerAdvances({ size: 500 }),
    enabled: (allowCustomerFinance ?? false) && isAuthenticated && !authLoading,
  });

  const customerAdvancesByTrip = useMemo(() => {
    const map = new Map<string, CustomerAdvancePayment[]>();
    if (!customerAdvancesQuery.data) return map;
    for (const advance of customerAdvancesQuery.data) {
      if (!advance.tripId) continue;
      const list = map.get(advance.tripId) ?? [];
      list.push(advance);
      map.set(advance.tripId, list);
    }
    return map;
  }, [customerAdvancesQuery.data]);

  const handleCustomerAdvanceImagesSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (!files.length) {
      return;
    }
    if (files.length > MAX_VOUCHER_IMAGES) {
      toast({
        title: 'Quá số lượng ảnh',
        description: `Chỉ được chọn tối đa ${MAX_VOUCHER_IMAGES} ảnh`,
        variant: 'destructive',
      });
      return;
    }
    setCustomerAdvanceImagesLoading(true);
    try {
      const compressed = await compressImages(files);
      setCustomerAdvanceImages(compressed);
    } catch (error) {
      toast({
        title: 'Không thể xử lý ảnh',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    } finally {
      setCustomerAdvanceImagesLoading(false);
    }
  };

  const provinces = useMemo(() => getProvinces(), []);
  const [pickupProvinceCode, setPickupProvinceCode] = useState('');
  const [dropoffProvinceCode, setDropoffProvinceCode] = useState('');
  const [pickupWardCode, setPickupWardCode] = useState('');
  const [dropoffWardCode, setDropoffWardCode] = useState('');
  const [pickupWards, setPickupWards] = useState<WardOption[]>([]);
  const [dropoffWards, setDropoffWards] = useState<WardOption[]>([]);
  const [pickupPickerOpen, setPickupPickerOpen] = useState(false);
  const [dropoffPickerOpen, setDropoffPickerOpen] = useState(false);
  const [customerAdvanceForm, setCustomerAdvanceForm] = useState({
    tripId: '',
    customerName: '',
    customerPhone: '',
    amount: '',
    method: 'cash' as CustomerAdvanceMethod,
    receiptCode: '',
    note: '',
  });
  const [customerAdvanceImages, setCustomerAdvanceImages] = useState<File[]>([]);
  const customerAdvanceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [customerAdvanceImagesLoading, setCustomerAdvanceImagesLoading] = useState(false);
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [selectedTripForAdvance, setSelectedTripForAdvance] = useState<Trip | null>(null);
  const isAdvanceLocked = Boolean(selectedTripForAdvance);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trip> }) => updateTrip(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast({
        title: "Đã cập nhật",
        description: "Trạng thái chuyến đi đã được cập nhật",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast({
        title: "Đã hủy",
        description: "Chuyến đi đã được hủy",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trip> }) => updateTrip(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast({
        title: 'Đã cập nhật lịch chuyến',
        description: 'Thời gian đón/trả đã được điều chỉnh',
      });
      setEditingTrip(null);
    },
  });

  const customerAdvanceMutation = useMutation({
    mutationFn: createCustomerAdvance,
    onSuccess: () => {
      toast({
        title: 'Đã ghi nhận ứng trước',
        description: 'Đã tạo phiếu ứng tiền khách hàng',
      });
      setCustomerAdvanceForm({
        tripId: '',
        customerName: '',
        customerPhone: '',
        amount: '',
        method: 'cash',
        receiptCode: '',
        note: '',
      });
      setCustomerAdvanceImages([]);
      if (customerAdvanceFileInputRef.current) {
        customerAdvanceFileInputRef.current.value = '';
      }
      queryClient.invalidateQueries({ queryKey: ['customer-advances'] });
      setFinanceDialogOpen(false);
      setSelectedTripForAdvance(null);
    },
    onError: (error: unknown) => {
      toast({
        title: 'Không thể ghi nhận',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
        variant: 'destructive',
      });
    },
  });

  const handleConfirm = (id: string) => {
    updateMutation.mutate({
      id,
      data: { status: 'Đã xác nhận', confirmedAt: new Date().toISOString() }
    });
  };

  const handleCancel = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy chuyến này?')) {
      updateMutation.mutate({
        id,
        data: { status: 'Đã hủy' }
      });
    }
  };

  const findWardMatch = (address: string | undefined) => {
    if (!address) return undefined;
    for (const province of provinces) {
      const wards = getWards(province.code);
      const match = wards.find(
        (ward) => address.includes(ward.name) && address.includes(ward.district.name)
      );
      if (match) {
        return { province, ward: match };
      }
    }
    return undefined;
  };

  const buildAddress = (ward: WardOption | undefined, province: ProvinceOption | undefined) => {
    if (!ward) return '';
    const parts = [ward.name, ward.district.name, province?.name].filter(Boolean);
    return parts.join(', ');
  };

  const formatPriceDisplay = (value: string) =>
    value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const handlePriceInputChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');
    const sanitized = digitsOnly.replace(/^0+/, '');
    setScheduleForm((prev) => ({
      ...prev,
      price: sanitized,
    }));
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

  const handleDatePartChange = (field: 'pickupTime' | 'dropoffTime', date: Date | undefined) => {
    if (!date) return;
    setScheduleForm((prev) => {
      const current = parseLocalDateTime(prev[field]) ?? new Date();
      const updated = new Date(current);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      return {
        ...prev,
        [field]: formatLocalDateTime(updated),
      };
    });
  };

  const handleTimePartChange = (field: 'pickupTime' | 'dropoffTime', timeValue: string) => {
    setScheduleForm((prev) => {
      if (!timeValue) {
        return { ...prev, [field]: field === 'pickupTime' ? prev[field] : '' };
      }

      const [hour = 0, minute = 0] = timeValue.split(':').map(Number);
      const current = parseLocalDateTime(prev[field]) ?? new Date();
      const updated = new Date(current);
      updated.setHours(hour, minute, 0, 0);
      return {
        ...prev,
        [field]: formatLocalDateTime(updated),
      };
    });
  };

  const formatDateTimeLabel = (value: string) => {
    const parsed = parseLocalDateTime(value);
    if (!parsed) return '';
    return format(parsed, "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi });
  };

  const formatForInput = (value: string | undefined) => {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const handleOpenSchedule = (trip: Trip) => {
    if (['Đang đón', 'Đang đi', 'Hoàn thành', 'Đã hủy'].includes(trip.status)) {
      return;
    }

    setEditingTrip(trip);
    const pickupMatch = findWardMatch(trip.pickupLocation);
    const dropoffMatch = findWardMatch(trip.dropoffLocation);

    const initialPickupProvince = trip.pickupProvinceCode ?? pickupMatch?.province.code ?? '';
    const initialDropoffProvince = trip.dropoffProvinceCode ?? dropoffMatch?.province.code ?? '';

    const pickupWardOptions = initialPickupProvince ? getWards(initialPickupProvince) : [];
    const dropoffWardOptions = initialDropoffProvince ? getWards(initialDropoffProvince) : [];

    setPickupProvinceCode(initialPickupProvince);
    setDropoffProvinceCode(initialDropoffProvince);
    setPickupWards(pickupWardOptions);
    setDropoffWards(dropoffWardOptions);

    const initialPickupWard = trip.pickupWardCode ?? pickupMatch?.ward.code ?? '';
    const initialDropoffWard = trip.dropoffWardCode ?? dropoffMatch?.ward.code ?? '';
    setPickupWardCode(initialPickupWard);
    setDropoffWardCode(initialDropoffWard);

    setScheduleForm({
      pickupLocation: trip.pickupLocation,
      pickupProvinceCode: initialPickupProvince,
      pickupWardCode: initialPickupWard,
      dropoffLocation: trip.dropoffLocation,
      dropoffProvinceCode: initialDropoffProvince,
      dropoffWardCode: initialDropoffWard,
      passengers: String(trip.passengers),
      price: trip.price ? String(trip.price) : '',
      pickupTime: formatForInput(trip.pickupTime),
      dropoffTime: formatForInput(trip.dropoffTime),
    });
  };

  const handleScheduleChange = (
    field: keyof typeof scheduleForm,
    value: string
  ) => {
    setScheduleForm((prev) => ({ ...prev, [field]: value }));
  };

  const showDateTimePicker = (field: 'pickupTime' | 'dropoffTime') => {
    const input = document.getElementById(field) as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!input) return;
    input.focus({ preventScroll: true });
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    }
  };

  const handleScheduleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTrip) {
      return;
    }

    if (!scheduleForm.pickupLocation.trim() || !scheduleForm.dropoffLocation.trim()) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập điểm đón và điểm trả',
        variant: 'destructive',
      });
      return;
    }

    if (!scheduleForm.passengers || Number(scheduleForm.passengers) <= 0) {
      toast({
        title: 'Giá trị không hợp lệ',
        description: 'Số lượng hành khách phải lớn hơn 0',
        variant: 'destructive',
      });
      return;
    }

    if (!scheduleForm.price || Number(scheduleForm.price) <= 0) {
      toast({
        title: 'Giá trị không hợp lệ',
        description: 'Giá cước phải lớn hơn 0',
        variant: 'destructive',
      });
      return;
    }

    if (!scheduleForm.pickupTime) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập thời gian đón mới',
        variant: 'destructive',
      });
      return;
    }

    const pickupISO = new Date(scheduleForm.pickupTime).toISOString();
    const dropoffISO = scheduleForm.dropoffTime ? new Date(scheduleForm.dropoffTime).toISOString() : undefined;
    const passengers = Number(scheduleForm.passengers);
    const price = Number(scheduleForm.price);

    scheduleMutation.mutate({
      id: editingTrip.id,
      data: {
        pickupLocation: scheduleForm.pickupLocation.trim(),
        pickupProvinceCode: scheduleForm.pickupProvinceCode || undefined,
        pickupWardCode: scheduleForm.pickupWardCode || undefined,
        dropoffLocation: scheduleForm.dropoffLocation.trim(),
        dropoffProvinceCode: scheduleForm.dropoffProvinceCode || undefined,
        dropoffWardCode: scheduleForm.dropoffWardCode || undefined,
        passengers,
        price,
        pickupTime: pickupISO,
        dropoffTime: dropoffISO,
      },
    });
  };

  const filteredTrips = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    const normalizedPickupLocation = pickupLocationFilter.toLowerCase();
    const normalizedDropoffLocation = dropoffLocationFilter.toLowerCase();

    const base = trips.filter(trip => {
      const matchesSearch =
        trip.customerName.toLowerCase().includes(normalizedSearch) ||
        trip.customerPhone.includes(searchTerm) ||
        trip.pickupLocation.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
      const matchesDate = !dateFilter || trip.pickupTime.startsWith(dateFilter);

      const matchesPickupLocation = !pickupLocationFilter ||
        trip.pickupLocation.toLowerCase().includes(normalizedPickupLocation);

      const matchesDropoffLocation = !dropoffLocationFilter ||
        trip.dropoffLocation.toLowerCase().includes(normalizedDropoffLocation);

      const matchesTime = (() => {
        if (pickupTimeRange === 'all') return true;
        if (!trip.pickupTime) return false;
        const hour = new Date(trip.pickupTime).getHours();
        switch (pickupTimeRange) {
          case 'morning':
            return hour >= 6 && hour < 12;
          case 'afternoon':
            return hour >= 12 && hour < 18;
          case 'evening':
            return hour >= 18 && hour < 24;
          case 'night':
            return hour >= 0 && hour < 6;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesDate && matchesTime &&
        matchesPickupLocation && matchesDropoffLocation;
    });

    if (pickupTimeOrder === 'soonest') {
      return [...base].sort((a, b) => {
        const aTime = a.pickupTime ? new Date(a.pickupTime).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.pickupTime ? new Date(b.pickupTime).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
    }

    if (pickupTimeOrder === 'latest') {
      return [...base].sort((a, b) => {
        const aTime = a.pickupTime ? new Date(a.pickupTime).getTime() : Number.NEGATIVE_INFINITY;
        const bTime = b.pickupTime ? new Date(b.pickupTime).getTime() : Number.NEGATIVE_INFINITY;
        return bTime - aTime;
      });
    }

    return base;
  }, [trips, searchTerm, statusFilter, dateFilter, pickupTimeRange, pickupTimeOrder, pickupLocationFilter, dropoffLocationFilter]);

  const statusColors: Record<string, string> = {
    'Chờ xác nhận': 'bg-orange-100 text-orange-700 border-orange-200',
    'Đã xác nhận': 'bg-green-100 text-green-700 border-green-200',
    'Đã ghép chuyến': 'bg-blue-100 text-blue-700 border-blue-200',
    'Đã phân xe': 'bg-purple-100 text-purple-700 border-purple-200',
    'Đã hủy': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const pickupDate = parseLocalDateTime(scheduleForm.pickupTime);
  const dropoffDate = parseLocalDateTime(scheduleForm.dropoffTime);
  const pickupTimeValue = pickupDate ? format(pickupDate, 'HH:mm') : '';
  const dropoffTimeValue = dropoffDate ? format(dropoffDate, 'HH:mm') : '';

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
        <p className="text-muted-foreground">Vui lòng đăng nhập để xem danh sách đặt chuyến.</p>
      </div>
    );
  }



  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Tổng Đài - Quản Lý Đặt Chuyến</h1>
          <p className="text-sm text-muted-foreground">Tiếp nhận và xác nhận đặt chuyến từ khách hàng</p>
        </div>
        <div className="flex items-center gap-3">
          {allowCustomerFinance && (
            <Dialog
              open={financeDialogOpen}
              onOpenChange={(open) => {
                setFinanceDialogOpen(open);
                if (!open) {
                  setSelectedTripForAdvance(null);
                  setCustomerAdvanceForm({
                    tripId: '',
                    customerName: '',
                    customerPhone: '',
                    amount: '',
                    method: 'cash',
                    receiptCode: '',
                    note: '',
                  });
                  setCustomerAdvanceImages([]);
                  if (customerAdvanceFileInputRef.current) {
                    customerAdvanceFileInputRef.current.value = '';
                  }
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setSelectedTripForAdvance(null);
                    setCustomerAdvanceForm({
                      tripId: '',
                      customerName: '',
                      customerPhone: '',
                      amount: '',
                      method: 'cash',
                      receiptCode: '',
                      note: '',
                    });
                    setCustomerAdvanceImages([]);
                    if (customerAdvanceFileInputRef.current) {
                      customerAdvanceFileInputRef.current.value = '';
                    }
                  }}
                >
                  <Wallet size={18} />
                  Ghi nhận ứng trước
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Ghi nhận ứng trước của khách</DialogTitle>
                </DialogHeader>
                <input
                  ref={customerAdvanceFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleCustomerAdvanceImagesSelect}
                />
                {selectedTripForAdvance && (
                  <div className="border rounded-lg bg-muted/40 px-4 py-3 space-y-1 text-sm text-gray-700">
                    <div className="font-semibold text-gray-900">Chuyến #{selectedTripForAdvance.id}</div>
                    <div>
                      {selectedTripForAdvance.customerName} • {selectedTripForAdvance.customerPhone}
                    </div>
                    <div>
                      {selectedTripForAdvance.pickupLocation} → {selectedTripForAdvance.dropoffLocation}
                    </div>
                    <div>Giá cước: {formatCurrency(selectedTripForAdvance.price)}</div>
                  </div>
                )}
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const amount = Number(customerAdvanceForm.amount || 0);
                    if (!customerAdvanceForm.customerName.trim() || !customerAdvanceForm.customerPhone.trim() || !amount || amount <= 0) {
                      toast({
                        title: 'Thiếu thông tin',
                        description: 'Vui lòng nhập tên khách, số điện thoại và số tiền hợp lệ',
                        variant: 'destructive',
                      });
                      return;
                    }
                    customerAdvanceMutation.mutate({
                      tripId: customerAdvanceForm.tripId.trim() || undefined,
                      customerName: customerAdvanceForm.customerName.trim(),
                      customerPhone: customerAdvanceForm.customerPhone.trim(),
                      amount,
                      method: customerAdvanceForm.method,
                      collectedBy: user?.id ? user.id.toString() : undefined,
                      receiptCode: customerAdvanceForm.receiptCode.trim() || undefined,
                      note: customerAdvanceForm.note.trim() || undefined,
                      attachments: customerAdvanceImages,
                    });
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="finance-advance-trip">Mã chuyến (nếu có)</Label>
                      <Input
                        id="finance-advance-trip"
                        placeholder="VD: 142"
                        value={customerAdvanceForm.tripId}
                        disabled={isAdvanceLocked}
                        onChange={(event) => {
                          if (isAdvanceLocked) return;
                          setCustomerAdvanceForm((prev) => ({ ...prev, tripId: event.target.value }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="finance-advance-amount">Số tiền (₫) *</Label>
                      <Input
                        id="finance-advance-amount"
                        type="number"
                        min={0}
                        placeholder="VD: 500000"
                        value={customerAdvanceForm.amount}
                        onChange={(event) =>
                          setCustomerAdvanceForm((prev) => ({ ...prev, amount: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="finance-advance-customer">Tên khách *</Label>
                      <Input
                        id="finance-advance-customer"
                        value={customerAdvanceForm.customerName}
                        disabled={isAdvanceLocked}
                        onChange={(event) => {
                          if (isAdvanceLocked) return;
                          setCustomerAdvanceForm((prev) => ({ ...prev, customerName: event.target.value }));
                        }}
                        placeholder="Ví dụ: Nguyễn Văn A"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="finance-advance-phone">Số điện thoại *</Label>
                      <Input
                        id="finance-advance-phone"
                        value={customerAdvanceForm.customerPhone}
                        disabled={isAdvanceLocked}
                        onChange={(event) => {
                          if (isAdvanceLocked) return;
                          setCustomerAdvanceForm((prev) => ({ ...prev, customerPhone: event.target.value }));
                        }}
                        placeholder="0987654321"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Hình thức</Label>
                      <Select
                        value={customerAdvanceForm.method}
                        onValueChange={(value) =>
                          setCustomerAdvanceForm((prev) => ({ ...prev, method: value as CustomerAdvanceMethod }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Tiền mặt</SelectItem>
                          <SelectItem value="transfer">Chuyển khoản</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="finance-advance-receipt">Mã phiếu/biên lai</Label>
                      <Input
                        id="finance-advance-receipt"
                        value={customerAdvanceForm.receiptCode}
                        disabled={isAdvanceLocked}
                        onChange={(event) => {
                          if (isAdvanceLocked) return;
                          setCustomerAdvanceForm((prev) => ({ ...prev, receiptCode: event.target.value }));
                        }}
                        placeholder="Mã nội bộ hoặc biên lai"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Ảnh chứng từ</Label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={customerAdvanceImagesLoading}
                        onClick={() => customerAdvanceFileInputRef.current?.click()}
                      >
                        {customerAdvanceImages.length
                          ? `Thay ảnh (${customerAdvanceImages.length}/${MAX_VOUCHER_IMAGES})`
                          : 'Đính kèm ảnh (tối đa 3)'}
                      </Button>
                      {customerAdvanceImages.length > 0 && (
                        <Button type="button" variant="ghost" onClick={() => setCustomerAdvanceImages([])}>
                          Xóa ảnh
                        </Button>
                      )}
                      {customerAdvanceImagesLoading && (
                        <span className="text-xs text-muted-foreground">Đang xử lý ảnh...</span>
                      )}
                    </div>
                    {customerAdvanceImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {customerAdvanceImages.map((file, idx) => (
                          <Badge key={`advance-img-${idx}`} variant="outline">
                            {file.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="finance-advance-note">Ghi chú</Label>
                    <Textarea
                      id="finance-advance-note"
                      rows={3}
                      placeholder="Thông tin bổ sung cho kế toán"
                      value={customerAdvanceForm.note}
                      onChange={(event) =>
                        setCustomerAdvanceForm((prev) => ({ ...prev, note: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={customerAdvanceMutation.isPending || customerAdvanceImagesLoading}
                      className="min-w-32"
                    >
                      {customerAdvanceMutation.isPending ? 'Đang lưu...' : 'Ghi nhận'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Link to="/create-booking">
            <Button className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus size={20} />
              Tạo Đặt Chuyến
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Row 1: Search & Location Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type="text"
                      placeholder="Tìm khách hàng, SĐT..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600" size={18} />
                    <Input
                      type="text"
                      placeholder="Điểm đi..."
                      value={pickupLocationFilter}
                      onChange={(e) => setPickupLocationFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-600" size={18} />
                    <Input
                      type="text"
                      placeholder="Điểm đến..."
                      value={dropoffLocationFilter}
                      onChange={(e) => setDropoffLocationFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Row 2: Status, Date & Time Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả trạng thái</SelectItem>
                      <SelectItem value="Chờ xác nhận">Chờ xác nhận</SelectItem>
                      <SelectItem value="Đã xác nhận">Đã xác nhận</SelectItem>
                      <SelectItem value="Đã hủy">Đã hủy</SelectItem>
                    </SelectContent>
                  </Select>
                  <DatePickerField
                    value={dateFilter}
                    onChange={(value) => {
                      setDateFilter(value);
                      queryClient.invalidateQueries({ queryKey: ['trips'] });
                    }}
                    allowClear
                    placeholder="Ngày đón"
                  />
                  <Select value={pickupTimeRange} onValueChange={(value) => setPickupTimeRange(value as typeof pickupTimeRange)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Khung giờ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả khung giờ</SelectItem>
                      <SelectItem value="morning">Sáng (06:00 - 11:59)</SelectItem>
                      <SelectItem value="afternoon">Chiều (12:00 - 17:59)</SelectItem>
                      <SelectItem value="evening">Tối (18:00 - 23:59)</SelectItem>
                      <SelectItem value="night">Đêm (00:00 - 05:59)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={pickupTimeOrder} onValueChange={(value) => setPickupTimeOrder(value as 'none' | 'soonest' | 'latest')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sắp xếp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Mặc định</SelectItem>
                      <SelectItem value="soonest">Sớm nhất</SelectItem>
                      <SelectItem value="latest">Muộn nhất</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trips List */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Không tìm thấy chuyến đi nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTrips.map((trip, index) => {
                const advancesForTrip = customerAdvancesByTrip.get(trip.id) ?? [];
                const reconciledFromTrip = trip.customerAdvanceReconciled ?? 0;
                const pendingFromTrip = trip.customerAdvancePending ?? 0;
                const totalReconciled = advancesForTrip.length > 0
                  ? advancesForTrip.filter((advance) => advance.status === 'reconciled').reduce((sum, advance) => sum + advance.amount, 0)
                  : reconciledFromTrip;
                const totalPending = advancesForTrip.length > 0
                  ? advancesForTrip.filter((advance) => advance.status !== 'reconciled').reduce((sum, advance) => sum + advance.amount, 0)
                  : pendingFromTrip;
                const totalAdvance = totalReconciled + totalPending;
                const outstandingAmount = trip.customerOutstandingAmount ?? Math.max(trip.price - totalReconciled, 0);
                const hasAwaitingReconcile = totalPending > 0;

                const isEditable = !['Đang đón', 'Đang đi', 'Hoàn thành', 'Đã hủy'].includes(trip.status);

                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className={`hover:shadow-md transition-shadow border-l-4 ${trip.status === 'Hoàn thành' ? 'border-l-green-500' :
                      trip.status === 'Đã hủy' ? 'border-l-gray-400' :
                        trip.status === 'Đang đi' ? 'border-l-blue-500' :
                          trip.status === 'Đang đón' ? 'border-l-yellow-500' :
                            'border-l-orange-500'
                      }`}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          {/* Left Column: Info (Cols 1-8) */}
                          <div className="lg:col-span-8 space-y-3">
                            {/* Header: Name - Phone - Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                  {trip.customerName}
                                </h3>
                                <a href={`tel:${trip.customerPhone}`} className="text-muted-foreground text-base hover:text-green-600 flex items-center gap-1">
                                  <Phone size={12} /> {trip.customerPhone}
                                </a>
                              </div>
                              <Badge variant="outline" className={`${statusColors[trip.status]} border-0`}>
                                {trip.status}
                              </Badge>
                            </div>

                            {/* Locations: Compact Timeline */}
                            <div className="flex flex-col gap-1 text-base">
                              <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="font-medium text-gray-700">{trip.pickupLocation}</span>
                              </div>
                              {/* Connector line */}
                              <div className="pl-1.5 py-0.5 ml-[6px] border-l-2 border-dashed border-gray-200 h-2"></div>
                              <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                                <span className="font-medium text-gray-700">{trip.dropoffLocation}</span>
                              </div>
                            </div>

                            {/* Meta Row: Time | Pax | Vehicle | Notes */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon size={14} />
                                {new Date(trip.pickupTime).toLocaleString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users size={14} />
                                {trip.passengers} khách
                              </span>
                              {trip.fullVehicle && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                  Bao xe
                                </Badge>
                              )}
                              {trip.notes && (
                                <span className="flex items-center gap-1 max-w-[200px] truncate" title={trip.notes}>
                                  <FileText size={12} /> {trip.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Finance & Actions (Cols 9-12) */}
                          <div className="lg:col-span-4 flex flex-col justify-between gap-3 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-4">
                            {/* Financials */}
                            <div className="flex justify-between items-center lg:flex-col lg:items-end">
                              <span className="text-lg font-bold text-green-600">{formatCurrency(trip.price)}</span>
                              <div className="flex flex-col items-end text-xs gap-0.5">
                                {outstandingAmount > 0 ? (
                                  <span className="text-orange-600 font-medium">Thu: {formatCurrency(outstandingAmount)}</span>
                                ) : (
                                  <span className="text-gray-500 flex items-center gap-1"><CheckCircle size={10} /> Đã thu đủ</span>
                                )}
                                {hasAwaitingReconcile && (
                                  <span className="text-amber-600">Chờ đối soát: {formatCurrency(totalPending)}</span>
                                )}
                              </div>
                            </div>

                            {/* Actions Row */}
                            <div className="flex items-center justify-end gap-2 mt-auto">
                              {/* Primary Action based on Status */}
                              {trip.status === 'Chờ xác nhận' && (
                                <Button
                                  size="sm"
                                  className="h-8 text-xs bg-green-600 hover:bg-green-700 gap-1"
                                  onClick={() => handleConfirm(trip.id)}
                                >
                                  <CheckCircle size={12} /> Xác nhận
                                </Button>
                              )}
                              
                              {/* Customer Advance Button */}
                              {allowCustomerFinance && 
                               !['Đang đón', 'Đang đi', 'Hoàn thành', 'Đã hủy'].includes(trip.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => {
                                    setSelectedTripForAdvance(trip);
                                    setCustomerAdvanceForm({
                                      tripId: String(trip.id ?? ''),
                                      customerName: trip.customerName,
                                      customerPhone: trip.customerPhone,
                                      amount: '',
                                      method: 'cash',
                                      receiptCode: '',
                                      note: '',
                                    });
                                    setFinanceDialogOpen(true);
                                  }}
                                >
                                  <Wallet size={12} /> Ứng trước
                                </Button>
                              )}

                              {/* More Actions Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenSchedule(trip)} disabled={!isEditable}>
                                    <Clock className="mr-2 h-4 w-4" /> Sửa lịch
                                  </DropdownMenuItem>
                                  {trip.status === 'Chờ xác nhận' && (
                                    <DropdownMenuItem onClick={() => handleCancel(trip.id)} className="text-red-600">
                                      <XCircle className="mr-2 h-4 w-4" /> Hủy yêu cầu
                                    </DropdownMenuItem>
                                  )}
                                  {trip.status === 'Đã xác nhận' && (
                                    <DropdownMenuItem onClick={() => handleCancel(trip.id)} className="text-red-600">
                                      <XCircle className="mr-2 h-4 w-4" /> Hủy chuyến
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>

                        {/* Advance Payment List (Compact) */}
                        {advancesForTrip.length > 0 && (
                          <div className="mt-3 pt-2 border-t bg-gray-50/50 -mx-4 -mb-4 px-4 py-2 text-xs">
                            <div className="space-y-1">
                              {advancesForTrip.map((advance) => (
                                <div key={advance.id} className="flex items-center justify-between text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={customerAdvanceStatusVariants[advance.status]} className="text-[10px] h-4 px-1">
                                      {customerAdvanceStatusLabels[advance.status]}
                                    </Badge>
                                    <span>{methodLabels[advance.method]}</span>
                                    <span className="text-muted-foreground">
                                      {format(new Date(advance.collectedAt), 'HH:mm dd/MM')}
                                    </span>
                                  </div>
                                  <span className="font-medium">{formatCurrency(advance.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={!!editingTrip}
        onOpenChange={(open) => !open && !scheduleMutation.isPending && setEditingTrip(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa lịch chuyến</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tỉnh/Thành điểm đón</Label>
                  <Select
                    value={pickupProvinceCode}
                    onValueChange={(value) => {
                      setPickupProvinceCode(value);
                      const wards = getWards(value);
                      setPickupWards(wards);
                      setPickupWardCode('');
                      setScheduleForm((prev) => ({
                        ...prev,
                        pickupProvinceCode: value,
                        pickupWardCode: '',
                        pickupLocation: '',
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn tỉnh/thành" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((province) => (
                        <SelectItem key={province.code} value={province.code}>
                          {province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phường/Xã điểm đón</Label>
                  <Select
                    value={pickupWardCode}
                    onValueChange={(value) => {
                      setPickupWardCode(value);
                      const ward = pickupWards.find((item) => item.code === value);
                      const province = provinces.find((p) => p.code === pickupProvinceCode);
                      if (ward && province) {
                        setScheduleForm((prev) => ({
                          ...prev,
                          pickupLocation: buildAddress(ward, province),
                          pickupProvinceCode: province.code,
                          pickupWardCode: ward.code,
                        }));
                      }
                    }}
                    disabled={!pickupProvinceCode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phường/xã" />
                    </SelectTrigger>
                    <SelectContent>
                      {pickupWards.map((ward) => (
                        <SelectItem key={ward.code} value={ward.code}>
                          {ward.name} ({ward.district.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tỉnh/Thành điểm trả</Label>
                  <Select
                    value={dropoffProvinceCode}
                    onValueChange={(value) => {
                      setDropoffProvinceCode(value);
                      const wards = getWards(value);
                      setDropoffWards(wards);
                      setDropoffWardCode('');
                      setScheduleForm((prev) => ({
                        ...prev,
                        dropoffProvinceCode: value,
                        dropoffWardCode: '',
                        dropoffLocation: '',
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn tỉnh/thành" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((province) => (
                        <SelectItem key={province.code} value={province.code}>
                          {province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phường/Xã điểm trả</Label>
                  <Select
                    value={dropoffWardCode}
                    onValueChange={(value) => {
                      setDropoffWardCode(value);
                      const ward = dropoffWards.find((item) => item.code === value);
                      const province = provinces.find((p) => p.code === dropoffProvinceCode);
                      if (ward && province) {
                        setScheduleForm((prev) => ({
                          ...prev,
                          dropoffLocation: buildAddress(ward, province),
                          dropoffProvinceCode: province.code,
                          dropoffWardCode: ward.code,
                        }));
                      }
                    }}
                    disabled={!dropoffProvinceCode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phường/xã" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropoffWards.map((ward) => (
                        <SelectItem key={ward.code} value={ward.code}>
                          {ward.name} ({ward.district.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupLocation">Điểm đón *</Label>
              <Input
                id="pickupLocation"
                value={scheduleForm.pickupLocation}
                onChange={(e) => handleScheduleChange('pickupLocation', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropoffLocation">Điểm trả *</Label>
              <Input
                id="dropoffLocation"
                value={scheduleForm.dropoffLocation}
                onChange={(e) => handleScheduleChange('dropoffLocation', e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passengers">Số hành khách *</Label>
                <Input
                  id="passengers"
                  type="number"
                  min={1}
                  value={scheduleForm.passengers}
                  onChange={(e) => handleScheduleChange('passengers', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Giá cước (₫) *</Label>
                <Input
                  id="price"
                  inputMode="numeric"
                  value={scheduleForm.price ? formatPriceDisplay(scheduleForm.price) : ''}
                  onChange={(e) => handlePriceInputChange(e.target.value)}
                  placeholder="Ví dụ: 150.000"
                  required
                />
              </div>
            </div>
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
                    {scheduleForm.pickupTime ? (
                      formatDateTimeLabel(scheduleForm.pickupTime)
                    ) : (
                      <span className="text-muted-foreground">Chọn ngày giờ đón</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={pickupDate}
                    onSelect={(date) => handleDatePartChange('pickupTime', date ?? undefined)}
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
                      onChange={(e) => handleTimePartChange('pickupTime', e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropoffTimeButton">Thời gian trả (tùy chọn)</Label>
              <Popover open={dropoffPickerOpen} onOpenChange={setDropoffPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="dropoffTimeButton"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleForm.dropoffTime ? (
                      formatDateTimeLabel(scheduleForm.dropoffTime)
                    ) : (
                      <span className="text-muted-foreground">Chọn ngày giờ trả</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dropoffDate}
                    onSelect={(date) => handleDatePartChange('dropoffTime', date ?? undefined)}
                    locale={vi}
                    initialFocus
                  />
                  <div className="border-t px-3 py-2 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground" htmlFor="dropoffTimeInput">
                        Giờ trả
                      </Label>
                      <Input
                        id="dropoffTimeInput"
                        type="time"
                        value={dropoffTimeValue}
                        onChange={(e) => handleTimePartChange('dropoffTime', e.target.value)}
                      />
                    </div>
                    {scheduleForm.dropoffTime && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-center text-sm text-red-600 hover:text-red-700"
                        onClick={() => {
                          setScheduleForm((prev) => ({ ...prev, dropoffTime: '' }));
                          setDropoffPickerOpen(false);
                        }}
                      >
                        Xóa thời gian trả
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => !scheduleMutation.isPending && setEditingTrip(null)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={scheduleMutation.isPending}>
                {scheduleMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallCenter;