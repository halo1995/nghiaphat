package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.DriverTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Repository
public interface DriverTransactionRepository extends JpaRepository<DriverTransaction, Long> {
    Page<DriverTransaction> findByDriverId(Long driverId, Pageable pageable);
    
    Page<DriverTransaction> findByDriverIdOrderByCreatedAtDesc(Long driverId, Pageable pageable);

    Page<DriverTransaction> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT t FROM DriverTransaction t WHERE t.driverId = :driverId ORDER BY t.createdAt DESC LIMIT 1")
    Optional<DriverTransaction> findLatestByDriverId(@Param("driverId") Long driverId);

    List<DriverTransaction> findByDriverIdAndCreatedAtBetween(Long driverId, Date startDate, Date endDate);
}
