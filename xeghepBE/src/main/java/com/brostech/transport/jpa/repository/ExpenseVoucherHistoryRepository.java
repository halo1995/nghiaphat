package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.ExpenseVoucherHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpenseVoucherHistoryRepository extends JpaRepository<ExpenseVoucherHistory, Long> {

    List<ExpenseVoucherHistory> findByVoucherIdOrderByActionAtDesc(Long voucherId);
}
