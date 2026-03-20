package com.brostech.transport.dto.payment;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DepositRecordDTO {
    private Long id;
    private Long driverId;
    private Double amount;
    private String paymentMethod;
    private String createdAt;
    private String note;
    private List<PaymentAttachmentDTO> attachments;
}
