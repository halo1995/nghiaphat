package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "expense_voucher_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseVoucherHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_id", nullable = false)
    private Long voucherId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 20)
    private ExpenseVoucher.Status fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 20)
    private ExpenseVoucher.Status toStatus;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "action_by")
    private Long actionBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "action_at", nullable = false)
    private Date actionAt;

    @PrePersist
    public void prePersist() {
        if (actionAt == null) {
            actionAt = new Date();
        }
    }
}
