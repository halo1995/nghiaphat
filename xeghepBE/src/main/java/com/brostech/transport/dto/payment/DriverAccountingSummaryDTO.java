package com.brostech.transport.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverAccountingSummaryDTO {
    private Long driverId;
    private String driverName;
    private Double totalCollected;
    private Double totalDeposited;
    private Double outstanding;
    private Long completedTrips;
}
