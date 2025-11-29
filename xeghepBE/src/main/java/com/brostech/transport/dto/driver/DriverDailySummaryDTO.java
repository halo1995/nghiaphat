package com.brostech.transport.dto.driver;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DriverDailySummaryDTO {
    private Long driverId;
    private String driverName;
    private String date;
    private Double expectedAmount;
    private List<TripSummary> trips;

    @Data
    @Builder
    public static class TripSummary {
        private Long tripId;
        private String pickupLocation;
        private String dropoffLocation;
        private Double amount;
        private String status;
        private Double alreadyPaid;
    }
}
