package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.CompanyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Date;
import java.util.List;

public interface CompanyTransactionRepository extends JpaRepository<CompanyTransaction, Long> {
    List<CompanyTransaction> findByCreatedAtBetween(Date from, Date to);
}
