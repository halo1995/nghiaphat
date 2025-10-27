package com.brostech.transport.dto.payment;

import lombok.*;

@Data
@Builder
public class DepositRecordDTO {
    private Long id;
    private Long driverId;
    private Double amount;
    private String createdAt;
    private String note;
}
