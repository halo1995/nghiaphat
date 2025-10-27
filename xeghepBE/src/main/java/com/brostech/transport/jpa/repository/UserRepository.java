package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    Page<User> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Page<User> findByRole(User.UserRole role, Pageable pageable);
    Page<User> findByRoleAndNameContainingIgnoreCase(User.UserRole role, String name, Pageable pageable);
    Optional<User> findByIdAndRole(Long id, User.UserRole role);
    List<User> findAllByRole(User.UserRole role);
}
