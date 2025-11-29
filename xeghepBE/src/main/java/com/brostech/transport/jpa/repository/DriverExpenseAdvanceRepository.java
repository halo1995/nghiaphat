package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.DriverExpenseAdvance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Date;
import java.util.List;

public interface DriverExpenseAdvanceRepository extends JpaRepository<DriverExpenseAdvance, Long> {

    Page<DriverExpenseAdvance> findByDriverId(Long driverId, Pageable pageable);

    Page<DriverExpenseAdvance> findByDriverIdAndStatus(Long driverId, DriverExpenseAdvance.Status status, Pageable pageable);

    Page<DriverExpenseAdvance> findByStatus(DriverExpenseAdvance.Status status, Pageable pageable);

    List<DriverExpenseAdvance> findByDriverId(Long driverId);

    List<DriverExpenseAdvance> findByDriverIdAndStatusIn(Long driverId, Collection<DriverExpenseAdvance.Status> statuses);
    
    List<DriverExpenseAdvance> findByRequestedAtBetween(Date from, Date to);

    // Date range queries with pagination
    Page<DriverExpenseAdvance> findByRequestedAtBetween(Date from, Date to, Pageable pageable);

    Page<DriverExpenseAdvance> findByDriverIdAndRequestedAtBetween(Long driverId, Date from, Date to, Pageable pageable);

    Page<DriverExpenseAdvance> findByStatusAndRequestedAtBetween(DriverExpenseAdvance.Status status, Date from, Date to, Pageable pageable);

    Page<DriverExpenseAdvance> findByDriverIdAndStatusAndRequestedAtBetween(Long driverId, DriverExpenseAdvance.Status status, Date from, Date to, Pageable pageable);
}
