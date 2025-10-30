package com.brostech.transport.dto.payment;

import com.brostech.transport.jpa.entity.CustomerAdvancePayment;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CustomerAdvanceStatusUpdateRequest {
    @NotNull
    private CustomerAdvancePayment.Status status;

    private Long actionUserId;

    private String note;
}
