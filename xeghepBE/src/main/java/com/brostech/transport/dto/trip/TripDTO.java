package com.brostech.transport.dto.trip;

import com.brostech.transport.jpa.entity.Trip;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
public class TripDTO {
    private Long id;
    private Long vehicleId;
    private String vehicleName;
    private Long driverId;
    private String driverName;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private String pickupLocation;
    private String pickupProvinceCode;
    private String pickupWardCode;
    private String dropoffLocation;
    private String dropoffProvinceCode;
    private String dropoffWardCode;
    private String pickupTime;
    private String dropoffTime;
    private Integer distance;
    private BigDecimal price;
    private Trip.TripStatus status;
    private Integer passengers;
    private String notes;
    private Integer rating;
    private String createdAt;
    private String confirmedAt;
    private String assignedAt;
    private String startedAt;
    private String completedAt;
    private Boolean pickupConfirmed;
    private Boolean dropoffConfirmed;
    private String groupId;
}
