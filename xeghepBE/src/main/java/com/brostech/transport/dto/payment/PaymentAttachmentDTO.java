package com.brostech.transport.dto.payment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentAttachmentDTO {
    private Long id;
    private String fileName;
    private String contentType;
    private Long sizeBytes;
    private String createdAt;
    private String expiresAt;
    private String downloadUrl;
}
