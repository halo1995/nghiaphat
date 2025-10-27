package com.brostech.transport.dto.vehicle;

import com.brostech.transport.jpa.entity.Vehicle;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

@Data
public class VehicleRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String brand;
    @NotBlank
    private String model;
    @NotNull
    @Positive
    private Integer year;
    @NotBlank
    private String licensePlate;
    private String color;
    @NotNull
    @Positive
    private Integer seats;
    @NotNull
    private Vehicle.FuelType fuelType;
    @NotNull
    private Vehicle.VehicleStatus status = Vehicle.VehicleStatus.SAN_SANG;
    @NotNull
    @PositiveOrZero
    private Integer mileage;
    private String lastMaintenance;
    private String nextMaintenance;
    private String image;
}
