package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(name = "payment_attachments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", nullable = false, length = 32)
    private ReferenceType referenceType;

    @Column(name = "reference_id", nullable = false)
    private Long referenceId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "storage_path", nullable = false, length = 512)
    private String storagePath;

    @Column(name = "content_type", length = 128)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "checksum", length = 128)
    private String checksum;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "expires_at", nullable = false)
    private Date expiresAt;

    @PrePersist
    public void onCreate() {
        Date now = new Date();
        if (createdAt == null) {
            createdAt = now;
        }
        if (expiresAt == null) {
            expiresAt = now;
        }
    }

    public enum ReferenceType {
        TRIP_PAYMENT,
        DEPOSIT_RECORD,
        CUSTOMER_ADVANCE,
        DRIVER_EXPENSE_ADVANCE,
        EXPENSE_VOUCHER
    }
}
