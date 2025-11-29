import React, { useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TripPayment, PaymentAttachment } from '@/data/accounting';
import { Driver } from '@/data/drivers';

interface PaymentHistoryTableProps {
    data: TripPayment[];
    drivers: Driver[];
    selectedDriverFilter?: string;
    onOpenAttachment: (attachment: PaymentAttachment) => void;
}

const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('vi-VN', { hour12: false });
};

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
    data,
    drivers,
    selectedDriverFilter,
    onOpenAttachment,
}) => {
    const filteredPayments = useMemo(() => {
        if (!selectedDriverFilter) return data;
        return data.filter((payment) => payment.driverId === selectedDriverFilter);
    }, [data, selectedDriverFilter]);

    return (
        <>
            <Separator className="my-4" />
            <div className="text-sm font-medium mb-2">Thanh toán gần đây</div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Chuyến</TableHead>
                        <TableHead>Tài xế</TableHead>
                        <TableHead>Hình thức</TableHead>
                        <TableHead>Chứng từ</TableHead>
                        <TableHead className="text-right">Số tiền</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredPayments.map((payment) => {
                        const driver = drivers.find((d) => d.id === payment.driverId);
                        return (
                            <TableRow key={payment.id}>
                                <TableCell>{formatDateTime(payment.collectedAt)}</TableCell>
                                <TableCell>#{payment.tripId}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                    <span>{driver?.name || payment.driverId}</span>
                                    <Badge variant="outline">
                                        {payment.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {payment.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                                </TableCell>
                                <TableCell>
                                    {payment.attachments.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {payment.attachments.map((attachment) => (
                                                <Button
                                                    key={attachment.id}
                                                    variant="link"
                                                    size="sm"
                                                    onClick={() => onOpenAttachment(attachment)}
                                                >
                                                    {attachment.fileName}
                                                </Button>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Không có</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {payment.amount.toLocaleString('vi-VN')} ₫
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </>
    );
};
