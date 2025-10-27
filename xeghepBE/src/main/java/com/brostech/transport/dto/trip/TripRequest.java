package com.brostech.transport.dto.trip;

import com.brostech.transport.jpa.entity.Trip;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class TripRequest {
    
    private Long vehicleId;
    private String vehicleName;
    private Long driverId;
    private String driverName;
    @NotBlank
    private String customerName;
    
    @NotBlank
    private String customerPhone;
    
    @NotBlank
    private String pickupLocation;

    private String pickupProvinceCode;

    private String pickupWardCode;
    
    @NotBlank
    private String dropoffLocation;

    private String dropoffProvinceCode;

    private String dropoffWardCode;
    
    @NotBlank
    private String pickupTime;
    
    private String dropoffTime;
    
    private Integer distance;
    
    @NotNull
    private BigDecimal price;
    
    @NotNull
    private Integer passengers;
    
    private String notes;
    
    private Trip.TripStatus status = Trip.TripStatus.CHO_XAC_NHAN;

    private String assignedAt;
    private String startedAt;
    private String completedAt;
    private Boolean pickupConfirmed;
    private Boolean dropoffConfirmed;
    private String groupId;
}
