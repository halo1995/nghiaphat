package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.CompanyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyTransactionRepository extends JpaRepository<CompanyTransaction, Long> {
}
