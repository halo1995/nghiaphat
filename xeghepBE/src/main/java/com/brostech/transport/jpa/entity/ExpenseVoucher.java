package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "expense_vouchers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 64, unique = true)
    private String code;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Category category;

    @Column(nullable = false)
    private Double amount;

    @Column(name = "payee_name", nullable = false, length = 255)
    private String payeeName;

    @Column(name = "payee_account", length = 255)
    private String payeeAccount;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "wallet_id", nullable = false)
    private Long walletId;

    @Column(name = "driver_expense_advance_id")
    private Long driverExpenseAdvanceId;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_at", nullable = false)
    private Date updatedAt;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "submitted_at")
    private Date submittedAt;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "approved_at")
    private Date approvedAt;

    @Column(name = "rejected_by")
    private Long rejectedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "rejected_at")
    private Date rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @PrePersist
    public void prePersist() {
        Date now = new Date();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = Status.DRAFT;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = new Date();
    }

    public enum Status {
        DRAFT,
        PENDING,
        APPROVED,
        REJECTED
    }

    public enum Category {
        OFFICE_RENT,
        ELECTRICITY,
        WATER,
        SALARY,
        DRIVER_ADVANCE,
        OPERATIONS,
        OTHER
    }
}
