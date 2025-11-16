package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.ExpenseVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Date;
import java.util.List;
import java.util.Optional;

public interface ExpenseVoucherRepository extends JpaRepository<ExpenseVoucher, Long>, JpaSpecificationExecutor<ExpenseVoucher> {

    Optional<ExpenseVoucher> findByCode(String code);
    
    List<ExpenseVoucher> findByCreatedAtBetweenAndStatusIn(Date from, Date to, List<ExpenseVoucher.Status> statuses);
}
