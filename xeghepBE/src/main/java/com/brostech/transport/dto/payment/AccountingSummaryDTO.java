package com.brostech.transport.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountingSummaryDTO {
    private Double totalCollected;
    private Double totalDeposited;
    private Double totalOutstanding;
    private Long totalCompletedTrips;
    private List<DriverAccountingSummaryDTO> byDriver;
}
