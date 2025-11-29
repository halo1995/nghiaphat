import { useState, useEffect, useRef } from 'react';
import { PaymentAttachment } from '@/data/accounting';

export const useImagePreview = (attachments: PaymentAttachment[] = []) => {
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const previewUrlsRef = useRef<string[]>([]);

    useEffect(() => {
        const revokeAll = () => {
            previewUrlsRef.current.forEach((url) => url && URL.revokeObjectURL(url));
            previewUrlsRef.current = [];
        };

        revokeAll();
        setPreviewUrls([]);

        if (attachments.length === 0) {
            return () => {
                revokeAll();
            };
        }

        let cancelled = false;
        const token = localStorage.getItem('token');

        const loadPreviews = async () => {
            const urls: string[] = [];
            for (const attachment of attachments) {
                try {
                    const response = await fetch(attachment.downloadUrl, {
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    });
                    if (!response.ok) {
                        throw new Error('Failed to load attachment');
                    }
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    urls.push(objectUrl);
                } catch (error) {
                    console.error('Error loading preview:', error);
                    urls.push('');
                }
            }
            if (cancelled) {
                urls.forEach((url) => url && URL.revokeObjectURL(url));
                return;
            }
            previewUrlsRef.current = urls.filter((url) => !!url);
            setPreviewUrls(urls);
        };

        loadPreviews();

        return () => {
            cancelled = true;
            revokeAll();
        };
    }, [attachments]);

    return previewUrls;
};
