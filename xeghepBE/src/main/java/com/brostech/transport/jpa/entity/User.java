package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false, length = 64)
    private String username;
    
    @Column(nullable = false, length = 255)
    private String password;
    
    @Column(nullable = false, length = 255)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;
    
    @Column(length = 255)
    private String email;
    
    @Column(length = 32)
    private String phone;
    
    @Column(length = 500)
    private String avatar;
    
    @Column(name = "license_number", length = 64)
    private String licenseNumber;

    @Column(name = "license_expiry")
    @Temporal(TemporalType.TIMESTAMP)
    private Date licenseExpiry;

    @Column(length = 500)
    private String address;

    @Column(name = "date_of_birth")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dateOfBirth;

    @Column(name = "join_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date joinDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "driver_status", length = 20)
    private DriverStatus driverStatus;

    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(name = "total_trips")
    @Builder.Default
    private Integer totalTrips = 0;

    @Builder.Default
    private Double rating = 5.0;

    @Column(name = "total_earnings")
    @Builder.Default
    private Double totalEarnings = 0.0;

    @Column(name = "outstanding_balance")
    @Builder.Default
    private Double outstandingBalance = 0.0;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
    
    @Column(name = "last_login")
    @Temporal(TemporalType.TIMESTAMP)
    private Date lastLogin;

    @Column(name = "updated_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;
    
    @PrePersist
    public void prePersist() {
        var now = new Date();
        createdAt = now;
        if (joinDate == null) {
            joinDate = now;
        }
        if (driverStatus == null && role == UserRole.DRIVER) {
            driverStatus = DriverStatus.HOAT_DONG;
        }
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = new Date();
    }
    
    public enum UserRole {
        ADMIN, DISPATCHER, CALL_CENTER, DRIVER, ACCOUNTANT
    }

    public enum DriverStatus {
        HOAT_DONG, NGHI_PHEP, NGUNG_HOAT_DONG
    }
}
