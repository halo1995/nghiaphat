package com.brostech.transport.dto.payment;

import com.brostech.transport.jpa.entity.TripPayment;
import lombok.*;

@Data
@Builder
public class TripPaymentDTO {
    private Long id;
    private Long tripId;
    private Long driverId;
    private Double amount;
    private TripPayment.PaymentMethod method;
    private String collectedAt;
}
