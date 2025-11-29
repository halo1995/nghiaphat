package com.brostech.transport.dto.expense;

import com.brostech.transport.jpa.entity.ExpenseVoucher;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ExpenseVoucherRequest {

    @NotBlank
    private String title;

    @NotNull
    private ExpenseVoucher.Category category;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    private Double amount;

    // Người nhận tiền - không bắt buộc
    private String payeeName;

    private String payeeAccount;

    private String description;

    private String note;

    @NotNull
    private Long actorId;

    private Long walletId;

    private Long driverExpenseAdvanceId;

    private boolean submitImmediately;
}
