package com.brostech.transport.dto.payment;

import com.brostech.transport.jpa.entity.TripPayment;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TripPaymentDTO {
    private Long id;
    private Long tripId;
    private Long driverId;
    private Double amount;
    private TripPayment.PaymentMethod method;
    private String collectedAt;
    private List<PaymentAttachmentDTO> attachments;
}
