package com.brostech.transport.dto.expense;

import com.brostech.transport.dto.payment.PaymentAttachmentDTO;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ExpenseVoucherDTO {
    Long id;
    String code;
    String title;
    String category;
    Double amount;
    String payeeName;
    String payeeAccount;
    String description;
    String note;
    String status;
    Long walletId;
    String walletName;
    Long driverExpenseAdvanceId;
    Long createdBy;
    String createdByName;
    String createdAt;
    Long submittedBy;
    String submittedByName;
    String submittedAt;
    Long approvedBy;
    String approvedByName;
    String approvedAt;
    Long paidBy;
    String paidByName;
    String paidAt;
    Long rejectedBy;
    String rejectedByName;
    String rejectedAt;
    String rejectionReason;
    List<PaymentAttachmentDTO> attachments;
}
