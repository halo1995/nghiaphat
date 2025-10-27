package com.brostech.transport.jpa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import jakarta.persistence.Id;

import java.time.LocalDateTime;

/*
 * BASE ENTITY (BaseEntity)
 * Mục đích: Cung cấp các trường chung cho tất cả entity kế thừa (id, createdAt, updatedAt, isDeleted).
 * Giải thích trường:
 * - id: Khóa chính auto-increment.
 * - createdAt/updatedAt: Tự động gán thời gian tạo/cập nhật bởi Hibernate.
 * - isDeleted: Cờ xóa mềm (soft delete) nếu hệ thống cần (mặc định false).
 */
@MappedSuperclass
@Getter
@Setter
public abstract class BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private Boolean isDeleted = false;
}
