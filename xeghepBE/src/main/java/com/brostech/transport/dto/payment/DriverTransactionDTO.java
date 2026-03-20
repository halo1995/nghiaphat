package com.brostech.transport.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverTransactionDTO {
    private Long id;
    private Long driverId;
    private Double amount;
    private String transactionType; // CREDIT or DEBIT
    private Double balanceAfter;
    private String referenceType;
    private Long referenceId;
    private String description;
    private Date createdAt;
    private Long createdBy;
}
