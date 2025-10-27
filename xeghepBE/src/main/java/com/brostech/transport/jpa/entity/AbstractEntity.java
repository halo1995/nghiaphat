package com.brostech.transport.jpa.entity;

import java.io.Serializable;

/*
 * ABSTRACT ENTITY (di sản)
 * Ghi chú: Lớp trừu tượng generic lưu trường id kiểu T, hiện không được sử dụng trong các entity mới.
 * Hệ thống đang chuẩn hóa dùng `BaseEntity` (Long id, createdAt/updatedAt, isDeleted).
 * Có thể xoá/loại bỏ dần nếu không còn tham chiếu ở nơi khác.
 */
public abstract class AbstractEntity<T> implements Serializable {
    private T id;
}
