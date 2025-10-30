package com.brostech.transport.dto.payment;

import com.brostech.transport.jpa.entity.DriverExpenseAdvance;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DriverExpenseAdvanceStatusUpdateRequest {
    @NotNull
    private DriverExpenseAdvance.Status status;

    private Long actionUserId;

    private String note;

    private String rejectionReason;
}
