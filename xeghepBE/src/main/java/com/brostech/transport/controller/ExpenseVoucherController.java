package com.brostech.transport.controller;

import com.brostech.transport.dto.expense.ExpenseSummaryDTO;
import com.brostech.transport.dto.expense.ExpenseVoucherDTO;
import com.brostech.transport.dto.expense.ExpenseVoucherHistoryDTO;
import com.brostech.transport.dto.expense.ExpenseVoucherRequest;
import com.brostech.transport.dto.expense.ExpenseVoucherStatusUpdateRequest;
import com.brostech.transport.service.ExpenseVoucherService;
import com.brostech.transport.service.ExcelExportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("transport-service/expenses")
@PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
public class ExpenseVoucherController {

    private final ExpenseVoucherService expenseVoucherService;
    private final ExcelExportService excelExportService;

    @PostMapping(value = "/vouchers", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ExpenseVoucherDTO createWithAttachments(@Valid @RequestPart("payload") ExpenseVoucherRequest request,
                                                   @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return expenseVoucherService.create(request, images == null ? Collections.emptyList() : images);
    }

    @PostMapping(value = "/vouchers", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ExpenseVoucherDTO create(@Valid @RequestBody ExpenseVoucherRequest request) {
        return expenseVoucherService.create(request, Collections.emptyList());
    }

    @PutMapping(value = "/vouchers/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ExpenseVoucherDTO updateWithAttachments(@PathVariable Long id,
                                                   @Valid @RequestPart("payload") ExpenseVoucherRequest request,
                                                   @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return expenseVoucherService.update(id, request, images == null ? Collections.emptyList() : images);
    }

    @PutMapping(value = "/vouchers/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ExpenseVoucherDTO update(@PathVariable Long id,
                                    @Valid @RequestBody ExpenseVoucherRequest request) {
        return expenseVoucherService.update(id, request, Collections.emptyList());
    }

    @PatchMapping(value = "/vouchers/{id}/status", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ExpenseVoucherDTO updateStatusWithAttachments(@PathVariable Long id,
                                                         @Valid @RequestPart("payload") ExpenseVoucherStatusUpdateRequest request,
                                                         @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return expenseVoucherService.updateStatus(id, request, images == null ? Collections.emptyList() : images);
    }

    @PatchMapping(value = "/vouchers/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ExpenseVoucherDTO updateStatus(@PathVariable Long id,
                                          @Valid @RequestBody ExpenseVoucherStatusUpdateRequest request) {
        return expenseVoucherService.updateStatus(id, request, Collections.emptyList());
    }

    @GetMapping("/vouchers/{id}")
    public ExpenseVoucherDTO getById(@PathVariable Long id) {
        return expenseVoucherService.getById(id);
    }

    @GetMapping("/vouchers")
    public Page<ExpenseVoucherDTO> search(@RequestParam(value = "status", required = false) String status,
                                          @RequestParam(value = "category", required = false) String category,
                                          @RequestParam(value = "from", required = false) String from,
                                          @RequestParam(value = "to", required = false) String to,
                                          @RequestParam(value = "createdBy", required = false) Long createdBy,
                                          @RequestParam(value = "walletId", required = false) Long walletId,
                                          Pageable pageable) {
        return expenseVoucherService.search(status, category, from, to, createdBy, walletId, pageable);
    }

    @GetMapping("/vouchers/{id}/history")
    public List<ExpenseVoucherHistoryDTO> history(@PathVariable Long id) {
        return expenseVoucherService.getHistory(id);
    }

    @GetMapping("/summary")
    public ExpenseSummaryDTO summary(@RequestParam(value = "from", required = false) String from,
                                     @RequestParam(value = "to", required = false) String to) {
        return expenseVoucherService.getSummary(from, to);
    }

    @GetMapping(value = "/export", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public org.springframework.http.ResponseEntity<byte[]> exportVouchers(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to,
            @RequestParam(value = "createdBy", required = false) Long createdBy,
            @RequestParam(value = "walletId", required = false) Long walletId) {
        Page<ExpenseVoucherDTO> page = expenseVoucherService.search(status, category, from, to, createdBy, walletId, Pageable.unpaged());
        try {
            byte[] bytes = excelExportService.exportExpenseVouchers(page.getContent());
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=expense_vouchers.xlsx");
            return new org.springframework.http.ResponseEntity<>(bytes, headers, org.springframework.http.HttpStatus.OK);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Lỗi xuất file Excel", e);
        }
    }
}
