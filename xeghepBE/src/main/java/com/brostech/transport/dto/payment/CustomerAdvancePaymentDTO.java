package com.brostech.transport.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerAdvancePaymentDTO {
    private Long id;
    private Long tripId;
    private String customerName;
    private String customerPhone;
    private Double amount;
    private String method;
    private String status;
    private Long collectedBy;
    private String collectedAt;
    private Long submittedBy;
    private String submittedAt;
    private Long reconciledBy;
    private String reconciledAt;
    private String receiptCode;
    private String note;
}
