package com.brostech.transport.dto.vehicle;

import com.brostech.transport.jpa.entity.Vehicle;
import lombok.*;

@Data
@Builder
public class VehicleDTO {
    private Long id;
    private String name;
    private String brand;
    private String model;
    private Integer year;
    private String licensePlate;
    private String color;
    private Integer seats;
    private Vehicle.FuelType fuelType;
    private Vehicle.VehicleStatus status;
    private Integer mileage;
    private String lastMaintenance;
    private String nextMaintenance;
    private String image;
    private Integer totalTrips;
    private Double rating;
}
