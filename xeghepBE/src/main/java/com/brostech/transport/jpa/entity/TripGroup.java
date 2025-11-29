package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import jakarta.persistence.TemporalType;
import java.util.Date;

@Entity
@Table(name = "trip_groups")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "trip_ids", length = 1000)
    private String tripIds; // Store comma-separated trip IDs

    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(name = "vehicle_name", length = 255)
    private String vehicleName;

    @Column(name = "driver_id")
    private Long driverId;

    @Column(name = "driver_name", length = 255)
    private String driverName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GroupStatus status;

    @Column(name = "created_at", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Column(name = "total_passengers")
    private Integer totalPassengers;

    @Column(name = "total_revenue")
    private Double totalRevenue;

    @Column(name = "pickup_date")
    private java.time.LocalDate pickupDate;

    @PrePersist
    public void prePersist() {
        var now = new Date();
        createdAt = now;
    }

    @PreUpdate
    public void preUpdate() {
    }

    public enum GroupStatus {
        DANG_GHEP, DA_PHAN_XE, DANG_CHAY, HOAN_THANH
    }
}
