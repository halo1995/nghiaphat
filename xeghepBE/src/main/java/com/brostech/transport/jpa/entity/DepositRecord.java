package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import jakarta.persistence.TemporalType;
import java.util.Date;

@Entity
@Table(name = "deposit_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepositRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "driver_id")
    private Long driverId;
    
    @Column(name = "trip_id")
    private Long tripId; // Optional: Link deposit to specific trip for auto-allocation
    
    @Column(nullable = false)
    private Double amount;
    
    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
    
    @Column(length = 1000)
    private String note;
    
    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = new Date();
        }
    }
}
