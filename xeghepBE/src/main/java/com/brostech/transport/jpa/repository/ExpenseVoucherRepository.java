package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.ExpenseVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ExpenseVoucherRepository extends JpaRepository<ExpenseVoucher, Long>, JpaSpecificationExecutor<ExpenseVoucher> {

    Optional<ExpenseVoucher> findByCode(String code);
}
