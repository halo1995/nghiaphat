package com.brostech.transport.service;

import com.brostech.transport.dto.expense.ExpenseSummaryDTO;
import com.brostech.transport.dto.expense.ExpenseVoucherDTO;
import com.brostech.transport.dto.expense.ExpenseVoucherHistoryDTO;
import com.brostech.transport.dto.expense.ExpenseVoucherRequest;
import com.brostech.transport.dto.expense.ExpenseVoucherStatusUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ExpenseVoucherService {

    ExpenseVoucherDTO create(ExpenseVoucherRequest request, List<MultipartFile> attachments);

    ExpenseVoucherDTO update(Long id, ExpenseVoucherRequest request, List<MultipartFile> attachments);

    ExpenseVoucherDTO updateStatus(Long id, ExpenseVoucherStatusUpdateRequest request);

    ExpenseVoucherDTO getById(Long id);

    Page<ExpenseVoucherDTO> search(String status,
                                   String category,
                                   String from,
                                   String to,
                                   Long createdBy,
                                   Long walletId,
                                   Pageable pageable);

    List<ExpenseVoucherHistoryDTO> getHistory(Long voucherId);

    ExpenseSummaryDTO getSummary(String from, String to);
}
