import React, { useMemo } from 'react';
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
import { DepositRecord, PaymentAttachment } from '@/data/accounting';
import { Driver } from '@/data/drivers';

interface DepositHistoryTableProps {
    data: DepositRecord[];
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

export const DepositHistoryTable: React.FC<DepositHistoryTableProps> = ({
    data,
    drivers,
    selectedDriverFilter,
    onOpenAttachment,
}) => {
    const filteredDeposits = useMemo(() => {
        if (!selectedDriverFilter || selectedDriverFilter === 'all') return data;
        return data.filter((deposit) => deposit.driverId === selectedDriverFilter);
    }, [data, selectedDriverFilter]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lịch sử nộp tiền</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Thời gian</TableHead>
                            <TableHead>Tài xế</TableHead>
                            <TableHead className="text-right">Số tiền</TableHead>
                            <TableHead>Chứng từ</TableHead>
                            <TableHead>Ghi chú</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDeposits.map((deposit) => {
                            const driver = drivers.find((d) => d.id === deposit.driverId);
                            return (
                                <TableRow key={deposit.id}>
                                    <TableCell>{formatDateTime(deposit.createdAt)}</TableCell>
                                    <TableCell>{driver?.name || deposit.driverId}</TableCell>
                                    <TableCell className="text-right">
                                        {deposit.amount.toLocaleString('vi-VN')} ₫
                                    </TableCell>
                                    <TableCell>
                                        {deposit.attachments.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {deposit.attachments.map((attachment, idx) => (
                                                    <Button
                                                        key={attachment.id || idx}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => onOpenAttachment(attachment)}
                                                    >
                                                        Xem ảnh {deposit.attachments.length > 1 ? `(${idx + 1})` : ''}
                                                    </Button>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Không có</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{deposit.note || ''}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
