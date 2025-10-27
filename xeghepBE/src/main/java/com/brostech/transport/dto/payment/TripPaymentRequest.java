package com.brostech.transport.dto.payment;

import com.brostech.transport.jpa.entity.TripPayment;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TripPaymentRequest {
    @NotNull
    private Long tripId;
    
    @NotNull
    private Long driverId;
    
    @NotNull
    private Double amount;
    
    @NotNull
    private TripPayment.PaymentMethod method;
}
