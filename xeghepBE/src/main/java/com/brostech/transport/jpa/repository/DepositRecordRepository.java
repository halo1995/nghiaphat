package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.DepositRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Date;
import java.util.List;

public interface DepositRecordRepository extends JpaRepository<DepositRecord, Long> {
    List<DepositRecord> findByDriverId(Long driverId);
    Page<DepositRecord> findByDriverId(Long driverId, Pageable pageable);
    List<DepositRecord> findByCreatedAtBetween(Date from, Date to);
    List<DepositRecord> findByDriverIdAndCreatedAtBetween(Long driverId, Date from, Date to);
}
