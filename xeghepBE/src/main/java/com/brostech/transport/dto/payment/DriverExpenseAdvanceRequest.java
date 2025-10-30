package com.brostech.transport.dto.payment;

import com.brostech.transport.jpa.entity.DriverExpenseAdvance;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class DriverExpenseAdvanceRequest {
    @NotNull
    private Long driverId;

    private Long tripId;

    @NotNull
    @Positive
    private Double amount;

    @NotNull
    private DriverExpenseAdvance.ExpenseType expenseType;

    private Long requestedBy;

    private String note;
}
