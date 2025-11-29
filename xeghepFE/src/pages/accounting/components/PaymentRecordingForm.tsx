import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { compressImages, MAX_VOUCHER_IMAGES } from '@/utils/imageCompression';
import { useToast } from '@/hooks/use-toast';
import { Driver } from '@/data/drivers';
import { getDriverDailySummary } from '@/data/accounting';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PaymentRecordingFormProps {
    drivers: Driver[];
    onSubmit: (data: {
        driverId: string;
        amount: number;
        note: string;
        attachments: File[];
        paymentDate?: string;
    }) => void;
    isSubmitting: boolean;
}

export const PaymentRecordingForm: React.FC<PaymentRecordingFormProps> = ({
    drivers,
    onSubmit,
    isSubmitting,
}) => {
    const { toast } = useToast();
    const [paymentForm, setPaymentForm] = useState({
        date: new Date().toISOString().split('T')[0],
        driverId: '',
        amount: '',
        note: '',
    });
    const [paymentImages, setPaymentImages] = useState<File[]>([]);
    const [paymentImagesLoading, setPaymentImagesLoading] = useState(false);
    const [showTripDetails, setShowTripDetails] = useState(false);
    const paymentFileInputRef = useRef<HTMLInputElement | null>(null);

    // Query daily summary when date + driver selected
    const { data: dailySummary, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['driver-daily-summary', paymentForm.driverId, paymentForm.date],
        queryFn: () => getDriverDailySummary(paymentForm.driverId, paymentForm.date),
        enabled: !!paymentForm.driverId && !!paymentForm.date,
    });

    const handlePaymentImagesSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        event.target.value = '';
        if (!files.length) return;

        if (files.length > MAX_VOUCHER_IMAGES) {
            toast({
                title: 'Quá số lượng ảnh',
                description: `Chỉ được chọn tối đa ${MAX_VOUCHER_IMAGES} ảnh`,
                variant: 'destructive',
            });
            return;
        }
        setPaymentImagesLoading(true);
        try {
            const compressed = await compressImages(files);
            setPaymentImages(compressed);
        } catch (error) {
            toast({
                title: 'Không thể xử lý ảnh',
                description: error instanceof Error ? error.message : 'Vui lòng thử lại',
                variant: 'destructive',
            });
        } finally {
            setPaymentImagesLoading(false);
        }
    };

    const handleSubmit = () => {
        const amount = Number(paymentForm.amount || 0);
        if (!paymentForm.driverId || !amount || amount <= 0) {
            toast({
                title: 'Thiếu thông tin',
                description: 'Vui lòng chọn tài xế và nhập số tiền hợp lệ',
                variant: 'destructive',
            });
            return;
        }

        onSubmit({
            driverId: paymentForm.driverId,
            amount,
            note: paymentForm.note,
            attachments: paymentImages,
            paymentDate: paymentForm.date,
        });

        setPaymentForm({
            date: new Date().toISOString().split('T')[0],
            driverId: '',
            amount: '',
            note: '',
        });
        setPaymentImages([]);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ghi nhận tiền tài xế nộp về công ty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <input
                    ref={paymentFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePaymentImagesSelect}
                />

                {/* Date + Driver + Amount */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Ngày *</label>
                        <DatePickerField
                            value={paymentForm.date}
                            onChange={(value) =>
                                setPaymentForm((prev) => ({ ...prev, date: value || '' }))
                            }
                            placeholder="Chọn ngày"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Tài xế *</label>
                        <Select
                            value={paymentForm.driverId || undefined}
                            onValueChange={(value) =>
                                setPaymentForm((prev) => ({ ...prev, driverId: value }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn tài xế" />
                            </SelectTrigger>
                            <SelectContent>
                                {drivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.id}>
                                        {driver.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Số tiền (₫) *</label>
                        <Input
                            type="number"
                            min={0}
                            value={paymentForm.amount}
                            onChange={(e) =>
                                setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                            }
                            placeholder="Nhập số tiền"
                        />
                    </div>
                </div>

                {/* Summary & Trip Details */}
                {dailySummary && dailySummary.trips.length > 0 && (() => {
                    const totalDebt = dailySummary.expectedAmount;
                    const totalDeposited = dailySummary.trips.reduce((sum, trip) => sum + trip.alreadyPaid, 0);
                    const remainingDebt = totalDebt - totalDeposited;
                    const depositAmount = Number(paymentForm.amount || 0);
                    const afterDeposit = remainingDebt - depositAmount;

                    return (
                        <>
                            {/* Summary Card */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tổng giá trị chuyến:</span>
                                    <span className="font-semibold">{totalDebt.toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Đã nộp trước đó:</span>
                                    <span className="font-semibold text-green-600">-{totalDeposited.toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div className="border-t border-blue-300 pt-2 flex justify-between">
                                    <span className="text-sm font-medium">Còn thiếu:</span>
                                    <span className="font-bold text-orange-600">{remainingDebt.toLocaleString('vi-VN')}đ</span>
                                </div>
                                {depositAmount > 0 && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Số tiền nộp:</span>
                                            <span className="font-semibold text-blue-600">-{depositAmount.toLocaleString('vi-VN')}đ</span>
                                        </div>
                                        <div className="border-t border-blue-300 pt-2 flex justify-between">
                                            <span className="text-sm font-medium">Sau khi nộp:</span>
                                            <span className={`font-bold ${afterDeposit <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                {afterDeposit <= 0 ? '✓ Đã đủ' : `${afterDeposit.toLocaleString('vi-VN')}đ`}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Trip Details */}
                            <div className="border rounded-lg p-3 space-y-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowTripDetails(!showTripDetails)}
                                    className="w-full justify-between"
                                >
                                    <span className="text-sm font-medium">
                                        Chi tiết {dailySummary.trips.length} chuyến
                                    </span>
                                    {showTripDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </Button>
                                {showTripDetails && (
                                    <div className="space-y-2 pt-2">
                                        {dailySummary.trips.map((trip) => {
                                            const tripRemaining = trip.amount - trip.alreadyPaid;
                                            return (
                                                <div key={trip.tripId} className="text-xs p-2 bg-gray-50 rounded">
                                                    <div className="flex justify-between">
                                                        <span className="font-medium">#{trip.tripId}</span>
                                                        <span className="text-blue-600">{trip.amount.toLocaleString('vi-VN')}đ</span>
                                                    </div>
                                                    <div className="text-muted-foreground mt-1">
                                                        {trip.pickupLocation} → {trip.dropoffLocation}
                                                    </div>
                                                    <div className="flex justify-between mt-1">
                                                        {trip.alreadyPaid > 0 && (
                                                            <span className="text-green-600">
                                                                Đã nộp: {trip.alreadyPaid.toLocaleString('vi-VN')}đ
                                                            </span>
                                                        )}
                                                        <span className={tripRemaining > 0 ? 'text-orange-600' : 'text-green-600'}>
                                                            {tripRemaining > 0 ? `Còn: ${tripRemaining.toLocaleString('vi-VN')}đ` : '✓ Đã đủ'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    );
                })()}

                {/* Note */}
                <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Ghi chú</label>
                    <Textarea
                        rows={2}
                        value={paymentForm.note}
                        onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, note: e.target.value }))
                        }
                        placeholder="Ghi chú về khoản nộp tiền..."
                    />
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Ảnh chứng từ</label>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={paymentImagesLoading}
                            onClick={() => paymentFileInputRef.current?.click()}
                        >
                            {paymentImages.length
                                ? `Thay ảnh (${paymentImages.length}/${MAX_VOUCHER_IMAGES})`
                                : 'Đính kèm ảnh (tối đa 3)'}
                        </Button>
                        {paymentImages.length > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPaymentImages([])}
                            >
                                Xóa ảnh
                            </Button>
                        )}
                        {paymentImagesLoading && (
                            <span className="text-xs text-muted-foreground">Đang xử lý ảnh...</span>
                        )}
                    </div>
                    {paymentImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {paymentImages.map((file, idx) => (
                                <Badge key={`payment-img-${idx}`} variant="outline">
                                    {file.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit */}
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || paymentImagesLoading}
                    className="w-full"
                >
                    {isSubmitting ? 'Đang xử lý...' : 'Ghi nhận nộp tiền'}
                </Button>
            </CardContent>
        </Card>
    );
};
