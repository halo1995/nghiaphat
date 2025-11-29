import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PaymentRecordingFormProps {
    drivers: Driver[];
    onSubmit: (data: {
        tripId: string;
        driverId: string;
        amount: number;
        method: 'cash' | 'transfer';
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
        date: new Date().toISOString().split('T')[0], // Default today
        driverId: '',
        amount: '',
        method: 'cash' as 'cash' | 'transfer',
    });
    const [paymentImages, setPaymentImages] = useState<File[]>([]);
    const [paymentImagesLoading, setPaymentImagesLoading] = useState(false);
    const [showTripDetails, setShowTripDetails] = useState(false);
    const paymentFileInputRef = useRef<HTMLInputElement | null>(null);

    // Auto-query daily summary when date + driver selected
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

        if (!paymentForm.date) {
            toast({
                title: 'Thiếu ngày nộp tiền',
                description: 'Vui lòng chọn ngày nộp tiền',
                variant: 'destructive',
            });
            return;
        }

        // Send payment with date, tripId is optional (empty string will be converted to null)
        onSubmit({
            tripId: '', // Empty string will be converted to null in backend
            driverId: paymentForm.driverId,
            amount,
            method: paymentForm.method,
            attachments: paymentImages,
            paymentDate: paymentForm.date,
        });

        setPaymentForm({
            date: new Date().toISOString().split('T')[0],
            driverId: '',
            amount: '',
            method: 'cash'
        });
        setPaymentImages([]);
        setShowTripDetails(false);
    };

    const expectedAmount = dailySummary?.expectedAmount || 0;
    const actualAmount = Number(paymentForm.amount || 0);
    const difference = actualAmount - expectedAmount;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ghi nhận thu tiền từ tài xế</CardTitle>
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

                {/* Date + Driver Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Ngày nộp tiền *</label>
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
                </div>

                {/* Expected Amount Display */}
                {paymentForm.driverId && paymentForm.date && (
                    <div className="border rounded-lg p-3 bg-blue-50">
                        {isSummaryLoading ? (
                            <div className="text-sm text-muted-foreground">🔄 Đang tải...</div>
                        ) : dailySummary && dailySummary.trips.length > 0 ? (
                            <div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-blue-900">
                                            📊 Tổng cần nộp: {expectedAmount.toLocaleString('vi-VN')} ₫
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            🚗 {dailySummary.trips.length} chuyến
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowTripDetails(!showTripDetails)}
                                    >
                                        {showTripDetails ? (
                                            <>
                                                Thu gọn <ChevronUp className="ml-1 h-4 w-4" />
                                            </>
                                        ) : (
                                            <>
                                                Xem chi tiết <ChevronDown className="ml-1 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {showTripDetails && (
                                    <div className="mt-3 pt-3 border-t space-y-2">
                                        {dailySummary.trips.map((trip) => (
                                            <div
                                                key={trip.tripId}
                                                className="text-xs bg-white rounded px-2 py-1.5 flex justify-between"
                                            >
                                                <div className="flex-1">
                                                    <span className="font-medium">#{trip.tripId}</span>
                                                    <span className="text-muted-foreground ml-2">
                                                        {trip.pickupLocation} → {trip.dropoffLocation}
                                                    </span>
                                                </div>
                                                <span className="font-medium">
                                                    {trip.amount.toLocaleString('vi-VN')} ₫
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                ℹ️ Không có chuyến nào cần thu tiền trong ngày này
                            </div>
                        )}
                    </div>
                )}

                {/* Amount + Method + Submit */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Số tiền thực nộp (₫) *</label>
                        <Input
                            type="number"
                            min={0}
                            value={paymentForm.amount}
                            onChange={(event) =>
                                setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                            }
                            placeholder="Ví dụ: 500000"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Hình thức</label>
                        <Select
                            value={paymentForm.method}
                            onValueChange={(value: 'cash' | 'transfer') =>
                                setPaymentForm((prev) => ({ ...prev, method: value }))
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
                    <div className="md:col-span-2 flex gap-2">
                        <Button
                            className="flex-1"
                            disabled={isSubmitting || paymentImagesLoading || isSummaryLoading}
                            onClick={handleSubmit}
                        >
                            Ghi nhận
                        </Button>
                    </div>
                </div>

                {/* Difference Warning */}
                {expectedAmount > 0 && actualAmount > 0 && difference !== 0 && (
                    <div className={`rounded-lg p-3 flex items-start gap-2 ${difference < 0 ? 'bg-orange-50 text-orange-900' : 'bg-amber-50 text-amber-900'
                        }`}>
                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            {difference < 0 ? (
                                <>
                                    <strong>Thiếu {Math.abs(difference).toLocaleString('vi-VN')} ₫</strong>
                                    <div className="text-xs mt-1">Tài xế nợ lại phần còn thiếu</div>
                                </>
                            ) : (
                                <>
                                    <strong>Thừa {difference.toLocaleString('vi-VN')} ₫</strong>
                                    <div className="text-xs mt-1">Số tiền thừa sẽ được ghi nhận tạm ứng</div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Match Confirmation */}
                {expectedAmount > 0 && actualAmount === expectedAmount && (
                    <div className="rounded-lg p-3 bg-green-50 text-green-900 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">Số tiền khớp chính xác!</span>
                    </div>
                )}

                {/* Image Attachments */}
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                        <Button
                            type="button"
                            variant="outline"
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
                                <Badge key={`payment-image-${idx}`} variant="outline">
                                    {file.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
