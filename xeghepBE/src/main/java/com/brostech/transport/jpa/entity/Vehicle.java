package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import jakarta.persistence.TemporalType;
import java.util.Date;

@Entity
@Table(name = "vehicles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;
    
    @Column(length = 255)
    private String brand;
    
    @Column(length = 255)
    private String model;
    
    @Column
    private Integer year;
    
    @Column(name = "license_plate", length = 32, unique = true, nullable = false)
    private String licensePlate;
    
    private String color;
    
    @Column(nullable = false)
    private Integer seats;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FuelType fuelType;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VehicleStatus status;
    
    @Column
    private Integer mileage;
    
    @Column(name = "last_maintenance")
    @Temporal(TemporalType.TIMESTAMP)
    private Date lastMaintenance;
    
    @Column(name = "next_maintenance")
    @Temporal(TemporalType.TIMESTAMP)
    private Date nextMaintenance;
    
    @Column(length = 500)
    private String image;
    
    @Column(name = "total_trips")
    @Builder.Default
    private Integer totalTrips = 0;
    
    @Column
    @Builder.Default
    private Double rating = 5.0;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Column(name = "updated_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @PrePersist
    public void prePersist() {
        var now = new Date();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = new Date();
    }
    
    public enum FuelType {
        XANG, DAU, DIEN, HYBRID
    }
    
    public enum VehicleStatus {
        SAN_SANG, DANG_CHAY, BAO_TRI, NGUNG_HOAT_DONG
    }
}
