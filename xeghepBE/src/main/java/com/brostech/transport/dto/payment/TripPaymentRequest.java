package com.brostech.transport.dto.payment;

import com.brostech.transport.jpa.entity.TripPayment;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TripPaymentRequest {
    // tripId is optional - if null, payment will be recorded for the driver without specific trip
    private Long tripId;
    
    @NotNull
    private Long driverId;
    
    @NotNull
    private Double amount;
    
    @NotNull
    private TripPayment.PaymentMethod method;
    
    // Optional: date for which this payment is being recorded (format: yyyy-MM-dd)
    private String paymentDate;
}
