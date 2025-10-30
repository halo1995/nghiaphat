package com.brostech.transport.service;

import com.brostech.transport.dto.payment.AccountingSummaryDTO;
import com.brostech.transport.dto.payment.CustomerAdvancePaymentDTO;
import com.brostech.transport.dto.payment.CustomerAdvancePaymentRequest;
import com.brostech.transport.dto.payment.CustomerAdvanceStatusUpdateRequest;
import com.brostech.transport.dto.payment.DepositRecordDTO;
import com.brostech.transport.dto.payment.DepositRecordRequest;
import com.brostech.transport.dto.payment.DriverExpenseAdvanceDTO;
import com.brostech.transport.dto.payment.DriverExpenseAdvanceRequest;
import com.brostech.transport.dto.payment.DriverExpenseAdvanceStatusUpdateRequest;
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

    // Customer advance payments
    CustomerAdvancePaymentDTO createCustomerAdvancePayment(CustomerAdvancePaymentRequest req);
    CustomerAdvancePaymentDTO updateCustomerAdvanceStatus(Long id, CustomerAdvanceStatusUpdateRequest req);
    Page<CustomerAdvancePaymentDTO> searchCustomerAdvancePayments(String status, Long tripId, Pageable pageable);

    // Driver expense advances
    DriverExpenseAdvanceDTO createDriverExpenseAdvance(DriverExpenseAdvanceRequest req);
    DriverExpenseAdvanceDTO updateDriverExpenseAdvanceStatus(Long id, DriverExpenseAdvanceStatusUpdateRequest req);
    Page<DriverExpenseAdvanceDTO> searchDriverExpenseAdvances(Long driverId, String status, Pageable pageable);
}
