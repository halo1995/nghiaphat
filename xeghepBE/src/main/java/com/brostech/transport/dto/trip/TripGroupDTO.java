package com.brostech.transport.dto.trip;

import com.brostech.transport.jpa.entity.TripGroup;
import lombok.*;

@Data
@Builder
public class TripGroupDTO {
    private Long id;
    private String name;
    private String tripIds;
    private Long vehicleId;
    private String vehicleName;
    private Long driverId;
    private String driverName;
    private TripGroup.GroupStatus status;
    private String createdAt;
    private Integer totalPassengers;
    private Double totalRevenue;
    private String pickupDate; // Format: yyyy-MM-dd
}
