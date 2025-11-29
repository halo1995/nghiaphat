import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createDeposit,
    recordTripPayment,
    updateCustomerAdvanceStatus,
    updateDriverExpenseAdvanceStatus,
} from '@/data/accounting';
import { useToast } from '@/hooks/use-toast';

export const useAccountingMutations = () => {
    const qc = useQueryClient();
    const { toast } = useToast();

    const depositMut = useMutation({
        mutationFn: createDeposit,
        onSuccess: (_data, variables) => {
            toast({ title: 'Đã nộp tiền', description: 'Cập nhật công nợ tài xế thành công' });
            qc.invalidateQueries({ queryKey: ['drivers'] });
            qc.invalidateQueries({ queryKey: ['revenue-summary'] });
            qc.invalidateQueries({ queryKey: ['deposits'] });
        },
        onError: (e: unknown) => {
            toast({
                title: 'Lỗi',
                description: (e instanceof Error ? e.message : String(e)) || 'Không thể nộp tiền',
                variant: 'destructive',
            });
        },
    });

    const paymentMut = useMutation({
        mutationFn: recordTripPayment,
        onSuccess: () => {
            toast({ title: 'Đã ghi nhận', description: 'Tăng công nợ tài xế theo số tiền đã thu' });
            qc.invalidateQueries({ queryKey: ['drivers'] });
            qc.invalidateQueries({ queryKey: ['payments'] });
            qc.invalidateQueries({ queryKey: ['revenue-summary'] });
            qc.invalidateQueries({ queryKey: ['driver-daily-summary'] }); // Refresh daily summary nếu đang xem
            qc.invalidateQueries({ queryKey: ['trips'] }); // Refresh danh sách trips để cập nhật outstanding amount
        },
        onError: (e: unknown) => {
            toast({
                title: 'Lỗi',
                description: (e instanceof Error ? e.message : String(e)) || 'Không thể ghi nhận thu tiền',
                variant: 'destructive',
            });
        },
    });

    const customerAdvanceStatusMut = useMutation({
        mutationFn: updateCustomerAdvanceStatus,
        onSuccess: () => {
            toast({ title: 'Đã cập nhật', description: 'Trạng thái phiếu ứng trước đã thay đổi' });
            qc.invalidateQueries({ queryKey: ['customer-advances'] });
            qc.invalidateQueries({ queryKey: ['revenue-summary'] });
        },
        onError: (e: unknown) => {
            toast({
                title: 'Không thể cập nhật',
                description: (e instanceof Error ? e.message : String(e)) || 'Vui lòng thử lại',
                variant: 'destructive',
            });
        },
    });

    const driverAdvanceStatusMut = useMutation({
        mutationFn: updateDriverExpenseAdvanceStatus,
        onSuccess: () => {
            toast({ title: 'Đã cập nhật', description: 'Trạng thái tạm ứng phí tài xế đã thay đổi' });
            qc.invalidateQueries({ queryKey: ['driver-advances'] });
            qc.invalidateQueries({ queryKey: ['revenue-summary'] });
        },
        onError: (e: unknown) => {
            toast({
                title: 'Không thể cập nhật',
                description: (e instanceof Error ? e.message : String(e)) || 'Vui lòng thử lại',
                variant: 'destructive',
            });
        },
    });

    return {
        depositMut,
        paymentMut,
        customerAdvanceStatusMut,
        driverAdvanceStatusMut,
    };
};
