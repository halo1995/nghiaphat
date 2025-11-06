package com.brostech.transport.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PaymentAttachmentRetentionJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(PaymentAttachmentRetentionJob.class);

    private final PaymentAttachmentService attachmentService;

    @Scheduled(cron = "0 30 2 * * *")
    public void purgeExpiredAttachments() {
        int removed = attachmentService.purgeExpiredAttachments();
        if (removed > 0 && LOGGER.isInfoEnabled()) {
            LOGGER.info("Removed {} expired payment attachments", removed);
        }
    }
}
