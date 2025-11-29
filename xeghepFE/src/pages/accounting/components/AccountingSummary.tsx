import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueSummary } from '@/data/accounting';

interface AccountingSummaryProps {
    data?: RevenueSummary;
}

export const AccountingSummary: React.FC<AccountingSummaryProps> = ({ data }) => {
    const totalOutstanding = data?.totalOutstanding ?? 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Tài xế đã thu</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                        {data ? data.totalRevenue.toLocaleString('vi-VN') : '...'} ₫
                    </div>
                    <p className="text-xs text-muted-foreground">Tổng tiền khách trả cho tài xế trong kỳ</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Đã nộp về công ty</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                        {data ? data.totalDeposited.toLocaleString('vi-VN') : '...'} ₫
                    </div>
                    <p className="text-xs text-muted-foreground">Các khoản tài xế đã giao nộp lại</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Công nợ hiện tại</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-amber-600">
                        {totalOutstanding.toLocaleString('vi-VN')} ₫
                    </div>
                    <p className="text-xs text-muted-foreground">Số tiền công ty cần thu thêm từ tài xế</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Chuyến hoàn thành</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-gray-800">
                        {data ? data.completedTrips.toLocaleString('vi-VN') : '...'}
                    </div>
                    <p className="text-xs text-muted-foreground">Tổng chuyến đã hoàn thành trong kỳ</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Ứng trước khách chờ nộp</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-amber-700">
                        {data ? data.totalCustomerPrepaidPending.toLocaleString('vi-VN') : '...'} ₫
                    </div>
                    <p className="text-xs text-muted-foreground">Các khoản tổng đài đã thu nhưng chưa bàn giao kế toán</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Đang chờ kế toán xác nhận</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-blue-700">
                        {data ? data.totalCustomerPrepaidSubmitted.toLocaleString('vi-VN') : '...'} ₫
                    </div>
                    <p className="text-xs text-muted-foreground">Phiếu đã chuyển kế toán nhưng chưa đối soát</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Tạm ứng phí tài xế</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-purple-700">
                        {data ? data.totalDriverAdvanceOutstanding.toLocaleString('vi-VN') : '...'} ₫
                    </div>
                    <p className="text-xs text-muted-foreground">Khoản ứng phí đã duyệt và chờ khấu trừ</p>
                </CardContent>
            </Card>
        </div>
    );
};
