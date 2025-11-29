import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CustomerAdvancePayment, CustomerAdvanceStatus } from '@/data/accounting';

interface CustomerAdvancesTableProps {
    data: CustomerAdvancePayment[];
    filter: 'all' | CustomerAdvanceStatus;
    onFilterChange: (value: 'all' | CustomerAdvanceStatus) => void;
    onAction: (record: CustomerAdvancePayment, status: CustomerAdvanceStatus) => void;
    onPreview: (record: CustomerAdvancePayment) => void;
    isLoading: boolean;
    isSubmitting: boolean;
}

const customerStatusLabels: Record<CustomerAdvanceStatus, string> = {
    pending: 'Chờ nộp',
    submitted: 'Đã chuyển kế toán',
    reconciled: 'Đã đối soát',
    rejected: 'Từ chối',
};

const customerStatusVariants: Record<
    CustomerAdvanceStatus,
    'outline' | 'default' | 'secondary' | 'destructive'
> = {
    pending: 'outline',
    submitted: 'secondary',
    reconciled: 'default',
    rejected: 'destructive',
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('vi-VN', { hour12: false });
};

export const CustomerAdvancesTable: React.FC<CustomerAdvancesTableProps> = ({
    data,
    filter,
    onFilterChange,
    onAction,
    onPreview,
    isLoading,
    isSubmitting,
}) => {
    return (
        <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle>Phiếu ứng trước của khách</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Quản lý các khoản tổng đài viên đã thu hộ khách
                    </p>
                </div>
                <Select
                    value={filter}
                    onValueChange={(value) => onFilterChange(value as 'all' | CustomerAdvanceStatus)}
                >
                    <SelectTrigger className="w-full sm:w-56">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="pending">{customerStatusLabels.pending}</SelectItem>
                        <SelectItem value="submitted">{customerStatusLabels.submitted}</SelectItem>
                        <SelectItem value="reconciled">{customerStatusLabels.reconciled}</SelectItem>
                        <SelectItem value="rejected">{customerStatusLabels.rejected}</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="py-6 text-center text-muted-foreground">Đang tải dữ liệu...</div>
                ) : data.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground">
                        Chưa có phiếu ứng trước nào với bộ lọc hiện tại
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Thời gian nhận</TableHead>
                                <TableHead>Khách hàng</TableHead>
                                <TableHead className="text-right">Số tiền</TableHead>
                                <TableHead>Hình thức</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((record) => {
                                const actions: Array<{
                                    label: string;
                                    status: CustomerAdvanceStatus;
                                    variant?: 'outline' | 'default' | 'secondary' | 'destructive';
                                }> = [];
                                if (record.status === 'pending') {
                                    actions.push({
                                        label: 'Chuyển kế toán',
                                        status: 'submitted',
                                        variant: 'secondary',
                                    });
                                    actions.push({ label: 'Từ chối', status: 'rejected', variant: 'destructive' });
                                } else if (record.status === 'submitted') {
                                    actions.push({
                                        label: 'Đã đối soát',
                                        status: 'reconciled',
                                        variant: 'default',
                                    });
                                    actions.push({ label: 'Từ chối', status: 'rejected', variant: 'destructive' });
                                }
                                const methodLabel = record.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản';
                                return (
                                    <TableRow key={record.id}>
                                        <TableCell>{formatDateTime(record.collectedAt)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{record.customerName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {record.customerPhone}
                                                </span>
                                                {record.tripId && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Chuyến #{record.tripId}
                                                    </span>
                                                )}
                                                {record.receiptCode && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Phiếu: {record.receiptCode}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {record.amount.toLocaleString('vi-VN')} ₫
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{methodLabel}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={customerStatusVariants[record.status]}>
                                                {customerStatusLabels[record.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end flex-wrap gap-2">
                                                {record.attachments.length > 0 && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => onPreview(record)}
                                                    >
                                                        Xem ảnh ({record.attachments.length})
                                                    </Button>
                                                )}
                                                {actions.map((action) => (
                                                    <Button
                                                        key={action.label}
                                                        size="sm"
                                                        variant={action.variant ?? 'outline'}
                                                        disabled={isSubmitting}
                                                        onClick={() => onAction(record, action.status)}
                                                    >
                                                        {action.label}
                                                    </Button>
                                                ))}
                                            </div>
                                            {record.note && (
                                                <p className="mt-2 text-xs text-muted-foreground text-right">
                                                    {record.note}
                                                </p>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
