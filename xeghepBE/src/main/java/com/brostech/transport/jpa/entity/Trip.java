package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import jakarta.persistence.TemporalType;
import java.math.BigDecimal;
import java.util.Date;

@Entity
@Table(name = "trips")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_id")
    private Long vehicleId;
    
    @Column(name = "vehicle_name", length = 255)
    private String vehicleName;
    
    @Column(name = "driver_id")
    private Long driverId;
    
    @Column(name = "driver_name", length = 255)
    private String driverName;
    
    @Column(name = "customer_name", nullable = false, length = 255)
    private String customerName;
    
    @Column(name = "customer_phone", nullable = false, length = 32)
    private String customerPhone;
    
    @Column(name = "pickup_location", nullable = false, length = 500)
    private String pickupLocation;

    @Column(name = "pickup_province_code", nullable = false, length = 16)
    private String pickupProvinceCode;

    @Column(name = "pickup_ward_code", nullable = false, length = 16)
    private String pickupWardCode;

    @Column(name = "dropoff_location", nullable = false, length = 500)
    private String dropoffLocation;

    @Column(name = "dropoff_province_code", nullable = false, length = 16)
    private String dropoffProvinceCode;

    @Column(name = "dropoff_ward_code", nullable = false, length = 16)
    private String dropoffWardCode;

    @Column(name = "pickup_time", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date pickupTime;
    
    @Column(name = "dropoff_time")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dropoffTime;
    
    @Column
    private Integer distance;
    
    @Column(nullable = false)
    private BigDecimal price;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripStatus status;
    
    @Column(nullable = false)
    private Integer passengers;
    
    @Column(length = 1000)
    private String notes;
    
    @Column
    private Integer rating;
    
    @Column(name = "created_at", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
    
    @Column(name = "confirmed_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date confirmedAt;
    
    @Column(name = "assigned_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date assignedAt;
    
    @Column(name = "started_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date startedAt;
    
    @Column(name = "completed_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date completedAt;
    
    @Column(name = "pickup_confirmed")
    @Builder.Default
    private Boolean pickupConfirmed = false;
    
    @Column(name = "dropoff_confirmed")
    @Builder.Default
    private Boolean dropoffConfirmed = false;
    
    @Column(name = "group_id", length = 64)
    private String groupId;

    @PrePersist
    public void prePersist() {
        var now = new Date();
        createdAt = now;
    }

    @PreUpdate
    public void preUpdate() {
    }
    
    public enum TripStatus {
        CHO_XAC_NHAN, DA_XAC_NHAN, DA_GHEP_CHUYEN, DA_PHAN_XE, DANG_DON, DANG_DI, HOAN_THANH, DA_HUY
    }
}
