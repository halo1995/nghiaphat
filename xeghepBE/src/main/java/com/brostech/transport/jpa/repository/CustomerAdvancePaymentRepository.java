package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.CustomerAdvancePayment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.brostech.transport.jpa.entity.CustomerAdvancePayment.Status;

public interface CustomerAdvancePaymentRepository extends JpaRepository<CustomerAdvancePayment, Long> {

    Page<CustomerAdvancePayment> findByStatus(CustomerAdvancePayment.Status status, Pageable pageable);

    Page<CustomerAdvancePayment> findByTripId(Long tripId, Pageable pageable);

    Page<CustomerAdvancePayment> findByStatusAndTripId(CustomerAdvancePayment.Status status, Long tripId, Pageable pageable);

    List<CustomerAdvancePayment> findByStatus(CustomerAdvancePayment.Status status);

    List<CustomerAdvancePayment> findByStatusIn(Collection<CustomerAdvancePayment.Status> statuses);

    @Query("select coalesce(sum(c.amount), 0) from CustomerAdvancePayment c where c.tripId = :tripId and c.status = :status")
    Double sumAmountByTripIdAndStatus(@Param("tripId") Long tripId, @Param("status") CustomerAdvancePayment.Status status);

    @Query("select coalesce(sum(c.amount), 0) from CustomerAdvancePayment c where c.tripId = :tripId and c.status in :statuses")
    Double sumAmountByTripIdAndStatuses(@Param("tripId") Long tripId, @Param("statuses") Collection<CustomerAdvancePayment.Status> statuses);

    @Query("select coalesce(sum(c.amount), 0) " +
            "from CustomerAdvancePayment c, Trip t " +
            "where c.tripId = t.id and t.driverId = :driverId and c.status = :status")
    Double sumAmountByDriverIdAndStatus(@Param("driverId") Long driverId, @Param("status") Status status);
}
