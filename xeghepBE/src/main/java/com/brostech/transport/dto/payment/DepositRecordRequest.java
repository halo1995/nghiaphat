package com.brostech.transport.dto.payment;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DepositRecordRequest {
    @NotNull
    private Long driverId;
    
    @NotNull
    private Double amount;
    
    private String note;
}
