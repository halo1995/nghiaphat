import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDriverTransactions } from '@/data/accounting';
import { getDrivers } from '@/data/drivers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, ReceiptText } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

const DriverLedger = () => {
    const { user } = useAuth();
    const isDriver = user?.role === 'DRIVER';
    const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
    const [page, setPage] = useState(0);
    const size = 20;

    React.useEffect(() => {
        if (isDriver && user?.id) {
            setSelectedDriverId(user.id.toString());
        }
    }, [isDriver, user?.id]);

    const { data: driversData } = useQuery({
        queryKey: ['drivers-list-simple'],
        queryFn: () => getDrivers(),
    });

    const drivers = driversData || [];

    const { data: transactionsData, isLoading } = useQuery({
        queryKey: ['driver-transactions', selectedDriverId, page],
        queryFn: () => getDriverTransactions({
            driverId: selectedDriverId === 'all' ? undefined : Number(selectedDriverId),
            page,
            size
        }),
    });

    const transactions = transactionsData?.data || [];
    const totalTransactions = transactionsData?.total || 0;
    const totalPages = Math.ceil(totalTransactions / size);

    const getTransactionTypeColor = (type: string) => {
        return type === 'CREDIT' ? 'text-green-600' : 'text-red-600';
    };

    const getTransactionTypeLabel = (type: string) => {
        return type === 'CREDIT' ? '+ Tăng dư nợ' : '- Giảm dư nợ';
    };

    const getReferenceTypeBadge = (refType: string) => {
        switch (refType) {
            case 'TRIP_CASH_COLLECTED':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700">Thu tiền mặt (Chuyến)</Badge>;
            case 'DEPOSIT_TO_COMPANY':
                return <Badge variant="outline" className="bg-purple-50 text-purple-700">Nộp tiền Cty</Badge>;
            case 'DRIVER_EXPENSE_ADVANCE':
                return <Badge variant="outline" className="bg-amber-50 text-amber-700">Tạm ứng chi phí</Badge>;
            case 'MANUAL_ADJUSTMENT':
                return <Badge variant="outline" className="bg-gray-50 text-gray-700">Điều chỉnh tay</Badge>;
            default:
                return <Badge variant="outline">{refType}</Badge>;
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50/50">
            <header className="flex items-center sticky top-0 z-10 gap-3 border-b bg-white px-4 py-3 shadow-sm md:gap-4 md:px-6 md:py-4">
                <SidebarTrigger />
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Sổ Quỹ Tài Xế</h1>
                    <p className="text-xs text-muted-foreground md:text-sm">Lịch sử biến động dư nợ của tài xế</p>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 md:max-w-7xl mx-auto w-full space-y-4">
                <Card>
                    <CardHeader className="p-4 md:p-6 pb-2">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-lg">Bộ lọc giao dịch</CardTitle>
                                <CardDescription>{isDriver ? 'Giao dịch cá nhân' : 'Lọc theo tài xế cụ thể'}</CardDescription>
                            </div>
                            {!isDriver && (
                                <div className="flex items-center gap-2">
                                    <Select value={selectedDriverId} onValueChange={(v) => {
                                        setSelectedDriverId(v);
                                        setPage(0);
                                    }}>
                                        <SelectTrigger className="w-[200px] md:w-[250px]">
                                            <SelectValue placeholder="Chọn tài xế" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tất cả tài xế</SelectItem>
                                            {drivers.map(d => (
                                                <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.phone})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto border-t">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[150px] font-semibold">Thời gian</TableHead>
                                    {selectedDriverId === 'all' && <TableHead className="font-semibold">Tài xế</TableHead>}
                                    <TableHead className="font-semibold">Loại giao dịch</TableHead>
                                    <TableHead className="text-right font-semibold">Biến động (₫)</TableHead>
                                    <TableHead className="text-right font-semibold">Dư nợ sau GD (₫)</TableHead>
                                    <TableHead className="font-semibold">Chi tiết</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={selectedDriverId === 'all' ? 6 : 5} className="h-32 text-center text-muted-foreground">
                                            Đang tải dữ liệu...
                                        </TableCell>
                                    </TableRow>
                                ) : transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={selectedDriverId === 'all' ? 6 : 5} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <ReceiptText className="h-8 w-8 text-muted-foreground/50" />
                                                <span className="text-muted-foreground">Không có giao dịch nào</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map((tx) => (
                                        <TableRow key={tx.id} className="hover:bg-muted/30">
                                            <TableCell className="whitespace-nowrap text-xs md:text-sm">
                                                {format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm')}
                                            </TableCell>
                                            {selectedDriverId === 'all' && (
                                                <TableCell className="font-medium">
                                                    {drivers.find(d => d.id.toString() === tx.driverId)?.name || `Tài xế #${tx.driverId}`}
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                {getReferenceTypeBadge(tx.referenceType)}
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${getTransactionTypeColor(tx.transactionType)}`}>
                                                {tx.transactionType === 'CREDIT' ? '+' : '-'}
                                                {Math.abs(tx.amount).toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {tx.balanceAfter.toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-muted-foreground" title={tx.description}>
                                                {tx.description}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2">
                        <div className="text-sm text-muted-foreground hidden sm:block">
                            Hiển thị {(page * size) + 1} - {Math.min((page + 1) * size, totalTransactions)} / {totalTransactions} giao dịch
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Trước
                            </Button>
                            <div className="text-sm font-medium px-2">
                                Trang {page + 1} / {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                            >
                                Sau
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DriverLedger;
