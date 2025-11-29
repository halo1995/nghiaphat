import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CustomerAdvancePayment,
    CustomerAdvanceStatus,
    PaymentAttachment,
} from '@/data/accounting';
import { useImagePreview } from '../hooks/useImagePreview';

interface AdvancePreviewDialogProps {
    data: CustomerAdvancePayment | null;
    action: CustomerAdvanceStatus | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirmAction: (
        id: string,
        status: CustomerAdvanceStatus,
        note?: string
    ) => void;
    isSubmitting: boolean;
    onOpenAttachment: (attachment: PaymentAttachment) => void;
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

export const AdvancePreviewDialog: React.FC<AdvancePreviewDialogProps> = ({
    data,
    action,
    isOpen,
    onClose,
    onConfirmAction,
    isSubmitting,
    onOpenAttachment,
}) => {
    const [activeTab, setActiveTab] = useState<'customer'>('customer');
    const [approvalNote, setApprovalNote] = useState('');
    const [previewImageIndex, setPreviewImageIndex] = useState(0);

    const attachments = data?.attachments ?? [];
    const previewUrls = useImagePreview(attachments);

    useEffect(() => {
        if (isOpen) {
            setApprovalNote('');
            setPreviewImageIndex(0);
        }
    }, [isOpen, data]);

    const handleConfirm = () => {
        if (!data || !action) return;
        onConfirmAction(data.id, action, approvalNote);
    };

    const activeAttachmentUrl = previewUrls[previewImageIndex] ?? '';
    const activeAttachment = attachments[previewImageIndex];
    const isApprovalMode = action !== null;

    if (!data) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Đối soát chứng từ</DialogTitle>
                </DialogHeader>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer')}>
                    <TabsList>
                        <TabsTrigger value="customer">Ứng trước khách</TabsTrigger>
                    </TabsList>
                    <TabsContent value="customer">
                        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
                            <div className="space-y-4">
                                {attachments.length > 0 ? (
                                    <>
                                        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted">
                                            {activeAttachmentUrl ? (
                                                <img
                                                    src={activeAttachmentUrl}
                                                    alt={activeAttachment?.fileName ?? 'attachment'}
                                                    className="h-full w-full object-contain"
                                                />
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    Không thể tải ảnh
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {attachments.map((attachment, index) => {
                                                const previewUrl = previewUrls[index] ?? '';
                                                const isActive = index === previewImageIndex;
                                                return (
                                                    <button
                                                        key={attachment.id}
                                                        type="button"
                                                        onClick={() => setPreviewImageIndex(index)}
                                                        className={`h-16 w-16 overflow-hidden rounded border ${isActive
                                                                ? 'ring-2 ring-primary ring-offset-2'
                                                                : 'opacity-80 hover:opacity-100'
                                                            }`}
                                                    >
                                                        {previewUrl ? (
                                                            <img
                                                                src={previewUrl}
                                                                alt={attachment.fileName}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="flex h-full w-full items-center justify-center px-1 text-[10px] text-muted-foreground">
                                                                Xem ảnh
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {activeAttachment && (
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onOpenAttachment(activeAttachment)}
                                                >
                                                    Mở file gốc
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                                        Không có chứng từ đính kèm
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-xs uppercase text-muted-foreground">Khách hàng</p>
                                    <p className="font-medium text-gray-900">{data.customerName}</p>
                                    <p className="text-muted-foreground">{data.customerPhone}</p>
                                </div>
                                {data.tripId && (
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">
                                            Chuyến liên quan
                                        </p>
                                        <p className="font-medium">#{data.tripId}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-2">
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">Số tiền</p>
                                        <p className="font-semibold text-gray-900">
                                            {data.amount.toLocaleString('vi-VN')} ₫
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">Hình thức</p>
                                        <p className="font-medium">
                                            {data.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">
                                            Trạng thái hiện tại
                                        </p>
                                        <Badge variant={customerStatusVariants[data.status]}>
                                            {customerStatusLabels[data.status]}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">Ngày nhận</p>
                                        <p>{formatDateTime(data.collectedAt)}</p>
                                    </div>
                                    {data.receiptCode && (
                                        <div>
                                            <p className="text-xs uppercase text-muted-foreground">
                                                Mã phiếu/biên lai
                                            </p>
                                            <p className="font-medium">{data.receiptCode}</p>
                                        </div>
                                    )}
                                </div>
                                {data.note && (
                                    <div>
                                        <p className="text-xs uppercase text-muted-foreground">
                                            Ghi chú hiện tại
                                        </p>
                                        <p>{data.note}</p>
                                    </div>
                                )}
                                {isApprovalMode && (
                                    <div className="space-y-2">
                                        <p className="text-xs uppercase text-muted-foreground">
                                            {action === 'rejected'
                                                ? 'Lý do từ chối *'
                                                : 'Ghi chú phê duyệt (tuỳ chọn)'}
                                        </p>
                                        <Textarea
                                            value={approvalNote}
                                            onChange={(event) => setApprovalNote(event.target.value)}
                                            placeholder={
                                                action === 'rejected'
                                                    ? 'Nhập lý do từ chối phiếu'
                                                    : 'Thêm ghi chú cho phiếu'
                                            }
                                            rows={4}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="gap-2 mt-4">
                            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Đóng
                            </Button>
                            {isApprovalMode && (
                                <Button onClick={handleConfirm} disabled={isSubmitting}>
                                    {action === 'rejected'
                                        ? 'Xác nhận từ chối'
                                        : action === 'reconciled'
                                            ? 'Xác nhận đã đối soát'
                                            : 'Chuyển kế toán'}
                                </Button>
                            )}
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
