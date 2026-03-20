package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "driver_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(nullable = false)
    private Double amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 20)
    private TransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", length = 50)
    private ReferenceType referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_by")
    private Long createdBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @Column(name = "balance_after")
    private Double balanceAfter;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = new Date();
        }
    }

    public enum TransactionType {
        DEBIT, // Ghi nợ (Tài xế nhận tiền -> nợ tăng)
        CREDIT // Ghi có (Tài xế trả tiền -> nợ giảm)
    }

    public enum ReferenceType {
        TRIP_CASH_COLLECTED,     // Tài xế thu tiền mặt từ khách
        DEPOSIT_TO_COMPANY,      // Tài xế nộp tiền cho công ty
        CUSTOMER_ADVANCED,       // Khách đã chuyển khoản trước cho công ty
        DRIVER_EXPENSE_ADVANCE,  // Công ty tạm ứng cho tài xế
        INITIAL_BALANCE,         // Số dư đầu kỳ
        MANUAL_ADJUSTMENT        // Điều chỉnh thủ công (nếu cần)
    }
}
