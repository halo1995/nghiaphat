package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import jakarta.persistence.TemporalType;
import java.util.Date;

/**
 * Entity KHÁCH HÀNG
 * Mục đích: Lưu thông tin khách để phục vụ đặt chuyến, gọi xác nhận và chăm sóc khách hàng
 */
@Entity
@Table(name = "customers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 64)
    private String email;

    @Column(length = 32)
    private String phone;
    
    @Column(length = 500)
    private String address;
    
    @Column(name = "join_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date joinDate;
    
    @Column(name = "total_trips")
    private Integer totalTrips = 0;
    
    @Column(name = "total_spent")
    private Double totalSpent = 0.0;
    
    @Column
    private Double rating = 5.0;
    
    @Column(length = 500)
    private String avatar;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CustomerStatus status = CustomerStatus.HOAT_DONG;
    
    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Column(name = "updated_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @PrePersist
    public void prePersist() {
        var now = new Date();
        if (joinDate == null) {
            joinDate = now;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = new Date();
    }
    
    public enum CustomerStatus {
        HOAT_DONG, NGUNG_HOAT_DONG
    }
}
