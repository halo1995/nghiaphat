package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "customer_advance_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerAdvancePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id")
    private Long tripId;

    @Column(name = "customer_name", nullable = false, length = 255)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 32)
    private String customerPhone;

    @Column(nullable = false)
    private Double amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "collected_by")
    private Long collectedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "collected_at", nullable = false)
    private Date collectedAt;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "submitted_at")
    private Date submittedAt;

    @Column(name = "reconciled_by")
    private Long reconciledBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "reconciled_at")
    private Date reconciledAt;

    @Column(name = "receipt_code", length = 64)
    private String receiptCode;

    @Column(length = 2000)
    private String note;

    @PrePersist
    public void prePersist() {
        if (collectedAt == null) {
            collectedAt = new Date();
        }
        if (status == null) {
            status = Status.PENDING;
        }
    }

    public enum PaymentMethod {
        CASH, TRANSFER
    }

    public enum Status {
        PENDING, SUBMITTED, RECONCILED, REJECTED
    }
}
