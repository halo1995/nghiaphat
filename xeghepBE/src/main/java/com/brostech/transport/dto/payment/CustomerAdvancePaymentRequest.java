package com.brostech.transport.dto.payment;

import com.brostech.transport.jpa.entity.CustomerAdvancePayment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CustomerAdvancePaymentRequest {
    private Long tripId;

    @NotBlank
    private String customerName;

    @NotBlank
    private String customerPhone;

    @NotNull
    @Positive
    private Double amount;

    @NotNull
    private CustomerAdvancePayment.PaymentMethod method;

    private Long collectedBy;

    private String receiptCode;

    private String note;
}
