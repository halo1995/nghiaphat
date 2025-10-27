package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.TripPayment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Date;
import java.util.List;

public interface TripPaymentRepository extends JpaRepository<TripPayment, Long> {
    List<TripPayment> findByDriverId(Long driverId);
    Page<TripPayment> findByDriverId(Long driverId, Pageable pageable);
    List<TripPayment> findByTripId(Long tripId);
    List<TripPayment> findByCollectedAtBetween(Date from, Date to);
    List<TripPayment> findByDriverIdAndCollectedAtBetween(Long driverId, Date from, Date to);
}
