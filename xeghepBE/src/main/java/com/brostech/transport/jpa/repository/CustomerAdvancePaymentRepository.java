package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.CustomerAdvancePayment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface CustomerAdvancePaymentRepository extends JpaRepository<CustomerAdvancePayment, Long> {

    Page<CustomerAdvancePayment> findByStatus(CustomerAdvancePayment.Status status, Pageable pageable);

    Page<CustomerAdvancePayment> findByTripId(Long tripId, Pageable pageable);

    Page<CustomerAdvancePayment> findByStatusAndTripId(CustomerAdvancePayment.Status status, Long tripId, Pageable pageable);

    List<CustomerAdvancePayment> findByStatus(CustomerAdvancePayment.Status status);

    List<CustomerAdvancePayment> findByStatusIn(Collection<CustomerAdvancePayment.Status> statuses);
}
