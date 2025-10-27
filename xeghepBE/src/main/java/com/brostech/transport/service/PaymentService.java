package com.brostech.transport.service;

import com.brostech.transport.dto.payment.AccountingSummaryDTO;
import com.brostech.transport.dto.payment.DepositRecordDTO;
import com.brostech.transport.dto.payment.DepositRecordRequest;
import com.brostech.transport.dto.payment.TripPaymentDTO;
import com.brostech.transport.dto.payment.TripPaymentRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PaymentService {
    // Trip payments
    TripPaymentDTO createTripPayment(TripPaymentRequest req);
    TripPaymentDTO getTripPaymentById(Long id);
    Page<TripPaymentDTO> searchTripPayments(Long driverId, Pageable pageable);
    void deleteTripPayment(Long id);
    
    // Deposit records
    DepositRecordDTO createDepositRecord(DepositRecordRequest req);
    DepositRecordDTO getDepositRecordById(Long id);
    Page<DepositRecordDTO> searchDepositRecords(Long driverId, Pageable pageable);
    void deleteDepositRecord(Long id);

    // Accounting summary
    AccountingSummaryDTO getAccountingSummary(String from, String to);
}
