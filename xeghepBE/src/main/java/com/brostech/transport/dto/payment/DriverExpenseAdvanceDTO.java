package com.brostech.transport.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverExpenseAdvanceDTO {
    private Long id;
    private Long driverId;
    private Long tripId;
    private Double amount;
    private String expenseType;
    private String status;
    private Long requestedBy;
    private String requestedAt;
    private Long approvedBy;
    private String approvedAt;
    private Long deductedBy;
    private String deductedAt;
    private String rejectionReason;
    private String note;
    private List<PaymentAttachmentDTO> attachments;
}
