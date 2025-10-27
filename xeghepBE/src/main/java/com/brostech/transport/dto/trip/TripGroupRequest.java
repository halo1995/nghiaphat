package com.brostech.transport.dto.trip;

import com.brostech.transport.jpa.entity.TripGroup;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TripGroupRequest {
    @NotBlank
    private String name;
    private String tripIds;
    private Long vehicleId;
    private String vehicleName;
    private Long driverId;
    private String driverName;
    private TripGroup.GroupStatus status = TripGroup.GroupStatus.DANG_GHEP;
    private Integer totalPassengers = 0;
    private Double totalRevenue = 0.0;
}
