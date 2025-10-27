package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import jakarta.persistence.TemporalType;
import java.util.Date;

@Entity
@Table(name = "trip_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "trip_id")
    private Long tripId;
    
    @Column(name = "driver_id")
    private Long driverId;
    
    @Column(nullable = false)
    private Double amount;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PaymentMethod method;
    
    @Column(name = "collected_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date collectedAt;
    
    @PrePersist
    public void prePersist() {
        if (collectedAt == null) {
            collectedAt = new Date();
        }
    }
    
    public enum PaymentMethod {
        CASH, TRANSFER
    }
}
