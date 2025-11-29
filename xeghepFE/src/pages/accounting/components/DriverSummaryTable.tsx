import React, { useState, useRef } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { compressImages, MAX_VOUCHER_IMAGES } from '@/utils/imageCompression';
import { useToast } from '@/hooks/use-toast';

interface DriverSummary {
    driverId: string;
    driverName: string;
    revenue: number;
    deposited: number;
    completedTrips: number;
    outstanding: number;
    advanceOutstanding: number;
}

interface DriverSummaryTableProps {
    data: DriverSummary[];
    onDeposit: (data: {
        driverId: string;
        amount: number;
        note: string;
        attachments: File[];
    }) => void;
    isSubmitting: boolean;
}

export const DriverSummaryTable: React.FC<DriverSummaryTableProps> = ({
    data,
    onDeposit,
    isSubmitting,
}) => {
    const { toast } = useToast();
    const [depositValues, setDepositValues] = useState<Record<string, string>>({});
    const [depositAttachments, setDepositAttachments] = useState<Record<string, File[]>>({});
    const [depositAttachmentTarget, setDepositAttachmentTarget] = useState<string | null>(null);
    const [depositImagesLoading, setDepositImagesLoading] = useState(false);
    const depositFileInputRef = useRef<HTMLInputElement | null>(null);

    const handleDepositImagesSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        event.target.value = '';
        if (!depositAttachmentTarget || !files.length) {
            setDepositAttachmentTarget(null);
            return;
        }
        if (files.length > MAX_VOUCHER_IMAGES) {
            toast({
                title: 'Quá số lượng ảnh',
                description: `Chỉ được chọn tối đa ${MAX_VOUCHER_IMAGES} ảnh`,
                variant: 'destructive',
            });
            setDepositAttachmentTarget(null);
            return;
        }
        setDepositImagesLoading(true);
        try {
            const compressed = await compressImages(files);
            setDepositAttachments((prev) => ({
                ...prev,
                [depositAttachmentTarget]: compressed,
            }));
        } catch (error) {
            toast({
                title: 'Không thể xử lý ảnh',
                description: error instanceof Error ? error.message : 'Vui lòng thử lại',
                variant: 'destructive',
            });
        } finally {
            setDepositImagesLoading(false);
            setDepositAttachmentTarget(null);
        }
    };

    const handleDeposit = (driverId: string) => {
        const rawValue = depositValues[driverId];
        const amount = Number(rawValue || 0);
        const attachments = depositAttachments[driverId] ?? [];

        if (!amount || amount <= 0) {
            toast({ title: 'Lỗi', description: 'Nhập số tiền hợp lệ', variant: 'destructive' });
            return;
        }

        onDeposit({
            driverId,
            amount,
            note: 'Nộp tiền mặt',
            attachments,
        });

        // Clear form after submission (optimistic, or we can wait for parent to tell us)
        // For now, let's clear it here. Ideally parent should trigger this or we use useEffect on isSubmitting
        setDepositValues((prev) => ({ ...prev, [driverId]: '' }));
        setDepositAttachments((prev) => {
            const next = { ...prev };
            delete next[driverId];
            return next;
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tổng hợp theo tài xế</CardTitle>
            </CardHeader>
            <CardContent>
                <input
                    ref={depositFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleDepositImagesSelect}
                />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tài xế</TableHead>
                            <TableHead className="text-right">Đã thu</TableHead>
                            <TableHead className="text-right">Đã nộp</TableHead>
                            <TableHead className="text-right">Công nợ</TableHead>
                            <TableHead className="text-right">Tạm ứng</TableHead>
                            <TableHead className="text-right">Chuyến hoàn thành</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((driver) => {
                            const driverAttachments = depositAttachments[driver.driverId] ?? [];
                            return (
                                <TableRow key={driver.driverId}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{driver.driverName}</span>
                                            <span className="text-xs text-muted-foreground">#{driver.driverId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{driver.revenue.toLocaleString('vi-VN')} ₫</TableCell>
                                    <TableCell className="text-right">{driver.deposited.toLocaleString('vi-VN')} ₫</TableCell>
                                    <TableCell className="text-right font-semibold text-amber-600">
                                        {driver.outstanding.toLocaleString('vi-VN')} ₫
                                    </TableCell>
                                    <TableCell className="text-right text-purple-600">
                                        {driver.advanceOutstanding.toLocaleString('vi-VN')} ₫
                                    </TableCell>
                                    <TableCell className="text-right">{driver.completedTrips}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
