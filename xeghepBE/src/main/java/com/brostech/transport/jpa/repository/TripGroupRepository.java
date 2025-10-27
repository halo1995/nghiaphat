package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.TripGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripGroupRepository extends JpaRepository<TripGroup, Long> {
    Page<TripGroup> findByStatus(TripGroup.GroupStatus status, Pageable pageable);
}
