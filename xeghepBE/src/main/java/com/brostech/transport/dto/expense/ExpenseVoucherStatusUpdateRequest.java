package com.brostech.transport.dto.expense;

import com.brostech.transport.jpa.entity.ExpenseVoucher;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ExpenseVoucherStatusUpdateRequest {

    @NotNull
    private ExpenseVoucher.Status status;

    @NotNull
    private Long actionUserId;

    private String note;

    private String rejectionReason;
}
