package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "driver_expense_advances")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverExpenseAdvance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "trip_id")
    private Long tripId;

    @Column(nullable = false)
    private Double amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "expense_type", nullable = false, length = 20)
    private ExpenseType expenseType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "requested_by")
    private Long requestedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "requested_at", nullable = false)
    private Date requestedAt;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "approved_at")
    private Date approvedAt;

    @Column(name = "transferred_by")
    private Long transferredBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "transferred_at")
    private Date transferredAt;

    @Column(name = "deducted_by")
    private Long deductedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "deducted_at")
    private Date deductedAt;

    @Column(name = "rejection_reason", length = 2000)
    private String rejectionReason;

    @Column(length = 2000)
    private String note;

    @PrePersist
    public void prePersist() {
        if (requestedAt == null) {
            requestedAt = new Date();
        }
        if (status == null) {
            status = Status.REQUESTED;
        }
    }

    public enum ExpenseType {
        TOLL, PARKING, FUEL, OTHER
    }

    public enum Status {
        REQUESTED, APPROVED, TRANSFERRED, DEDUCTED, REJECTED
    }
}
