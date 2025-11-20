package com.brostech.transport.service.impl;

import com.brostech.transport.dto.payment.AccountingSummaryDTO;
import com.brostech.transport.dto.payment.CustomerAdvancePaymentDTO;
import com.brostech.transport.dto.payment.CustomerAdvancePaymentRequest;
import com.brostech.transport.dto.payment.CustomerAdvanceStatusUpdateRequest;
import com.brostech.transport.dto.payment.DepositRecordDTO;
import com.brostech.transport.dto.payment.DepositRecordRequest;
import com.brostech.transport.dto.payment.DriverAccountingSummaryDTO;
import com.brostech.transport.dto.payment.DriverExpenseAdvanceDTO;
import com.brostech.transport.dto.payment.DriverExpenseAdvanceRequest;
import com.brostech.transport.dto.payment.DriverExpenseAdvanceStatusUpdateRequest;
import com.brostech.transport.dto.payment.PaymentAttachmentDTO;
import com.brostech.transport.dto.payment.TripPaymentDTO;
import com.brostech.transport.dto.payment.TripPaymentRequest;
import com.brostech.transport.jpa.entity.CompanyTransaction;
import com.brostech.transport.jpa.entity.CompanyWallet;
import com.brostech.transport.jpa.entity.CustomerAdvancePayment;
import com.brostech.transport.jpa.entity.DepositRecord;
import com.brostech.transport.jpa.entity.DriverExpenseAdvance;
import com.brostech.transport.jpa.entity.PaymentAttachment;
import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.entity.TripPayment;
import com.brostech.transport.jpa.entity.User;
import com.brostech.transport.jpa.repository.CompanyTransactionRepository;
import com.brostech.transport.jpa.repository.CompanyWalletRepository;
import com.brostech.transport.jpa.repository.CustomerAdvancePaymentRepository;
import com.brostech.transport.jpa.repository.DepositRecordRepository;
import com.brostech.transport.jpa.repository.DriverExpenseAdvanceRepository;
import com.brostech.transport.jpa.repository.TripPaymentRepository;
import com.brostech.transport.jpa.repository.TripRepository;
import com.brostech.transport.jpa.repository.UserRepository;
import com.brostech.transport.service.PaymentAttachmentService;
import com.brostech.transport.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.multipart.MultipartFile;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * PaymentServiceImpl
 * Nghiệp vụ: Quản lý thanh toán chuyến đi và đặt cọc của tài xế.
 * Quy tắc chính:
 * - Ghi nhận thanh toán cho từng chuyến (CASH/TRANSFER).
 * - Quản lý khoản đặt cọc của tài xế.
 * - Cập nhật số dư doanh thu và thanh toán cho tài xế.
 * - Hỗ trợ tra cứu lịch sử thanh toán theo tài xế.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private final TripPaymentRepository tripPaymentRepository;
    private final DepositRecordRepository depositRecordRepository;
    private final CustomerAdvancePaymentRepository customerAdvancePaymentRepository;
    private final DriverExpenseAdvanceRepository driverExpenseAdvanceRepository;
    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final PaymentAttachmentService attachmentService;
    private final CompanyWalletRepository companyWalletRepository;
    private final CompanyTransactionRepository companyTransactionRepository;
    
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    // Trip Payments

    @Override
    public TripPaymentDTO createTripPayment(TripPaymentRequest req, List<MultipartFile> attachments) {
        // Validate driver and trip exist
        User driver = userRepository.findByIdAndRole(req.getDriverId(), com.brostech.transport.jpa.entity.User.UserRole.DRIVER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid driverId"));

        tripRepository.findById(req.getTripId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tripId"));

        TripPayment payment = TripPayment.builder()
                .tripId(req.getTripId())
                .driverId(req.getDriverId())
                .amount(req.getAmount())
                .method(req.getMethod())
                .collectedAt(new Date())
                .build();
        
        payment = tripPaymentRepository.save(payment);

        adjustDriverOutstanding(driver, req.getAmount());
        double currentEarnings = Objects.requireNonNullElse(driver.getTotalEarnings(), 0.0);
        driver.setTotalEarnings(currentEarnings + req.getAmount());
        userRepository.save(driver);
        attachmentService.storeAttachments(PaymentAttachment.ReferenceType.TRIP_PAYMENT, payment.getId(),
                attachments == null ? Collections.emptyList() : attachments);
        return toTripPaymentDTO(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public TripPaymentDTO getTripPaymentById(Long id) {
        TripPayment payment = tripPaymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripPayment not found"));
        return toTripPaymentDTO(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TripPaymentDTO> searchTripPayments(Long driverId, Pageable pageable) {
        if (driverId != null) {
            return tripPaymentRepository.findByDriverId(driverId, pageable).map(this::toTripPaymentDTO);
        }
        return tripPaymentRepository.findAll(pageable).map(this::toTripPaymentDTO);
    }

    @Override
    public void deleteTripPayment(Long id) {
        TripPayment payment = tripPaymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripPayment not found"));
        tripPaymentRepository.deleteById(id);
        attachmentService.deleteAttachments(PaymentAttachment.ReferenceType.TRIP_PAYMENT, id);
        userRepository.findByIdAndRole(payment.getDriverId(), com.brostech.transport.jpa.entity.User.UserRole.DRIVER)
                .ifPresent(driver -> {
                    adjustDriverOutstanding(driver, -payment.getAmount());
                    double currentEarnings = Objects.requireNonNullElse(driver.getTotalEarnings(), 0.0);
                    double updatedEarnings = currentEarnings - payment.getAmount();
                    driver.setTotalEarnings(Math.max(updatedEarnings, 0));
                    userRepository.save(driver);
                });
    }

    // Deposit Records

    @Override
    public DepositRecordDTO createDepositRecord(DepositRecordRequest req, List<MultipartFile> attachments) {
        // Validate driver exists
        User driver = userRepository.findByIdAndRole(req.getDriverId(), com.brostech.transport.jpa.entity.User.UserRole.DRIVER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid driverId"));

        DepositRecord deposit = DepositRecord.builder()
                .driverId(req.getDriverId())
                .amount(req.getAmount())
                .note(req.getNote())
                .createdAt(new Date())
                .build();
        
        deposit = depositRecordRepository.save(deposit);
        adjustDriverOutstanding(driver, -req.getAmount());
        userRepository.save(driver);
        creditCompanyWallet(req.getAmount(),
                "Nộp tiền tài xế",
                PaymentAttachment.ReferenceType.DEPOSIT_RECORD,
                deposit.getId(),
                driver.getId());
        attachmentService.storeAttachments(PaymentAttachment.ReferenceType.DEPOSIT_RECORD, deposit.getId(),
                attachments == null ? Collections.emptyList() : attachments);
        return toDepositRecordDTO(deposit);
    }

    @Override
    @Transactional(readOnly = true)
    public DepositRecordDTO getDepositRecordById(Long id) {
        DepositRecord deposit = depositRecordRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DepositRecord not found"));
        return toDepositRecordDTO(deposit);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DepositRecordDTO> searchDepositRecords(Long driverId, Pageable pageable) {
        if (driverId != null) {
            return depositRecordRepository.findByDriverId(driverId, pageable).map(this::toDepositRecordDTO);
        }
        return depositRecordRepository.findAll(pageable).map(this::toDepositRecordDTO);
    }

    @Override
    public void deleteDepositRecord(Long id) {
        DepositRecord deposit = depositRecordRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DepositRecord not found"));
        depositRecordRepository.deleteById(id);
        attachmentService.deleteAttachments(PaymentAttachment.ReferenceType.DEPOSIT_RECORD, id);
        userRepository.findByIdAndRole(deposit.getDriverId(), com.brostech.transport.jpa.entity.User.UserRole.DRIVER)
                .ifPresent(driver -> {
                    adjustDriverOutstanding(driver, deposit.getAmount());
                    userRepository.save(driver);
                });
    }

    // Customer advance payments

    @Override
    public CustomerAdvancePaymentDTO createCustomerAdvancePayment(CustomerAdvancePaymentRequest req,
                                                                  List<MultipartFile> attachments) {
        if (req.getTripId() != null) {
            tripRepository.findById(req.getTripId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tripId"));
        }

        CustomerAdvancePayment advance = CustomerAdvancePayment.builder()
                .tripId(req.getTripId())
                .customerName(req.getCustomerName())
                .customerPhone(req.getCustomerPhone())
                .amount(req.getAmount())
                .method(req.getMethod())
                .status(CustomerAdvancePayment.Status.PENDING)
                .collectedBy(req.getCollectedBy())
                .collectedAt(new Date())
                .receiptCode(req.getReceiptCode())
                .note(req.getNote())
                .build();

        advance = customerAdvancePaymentRepository.save(advance);
        attachmentService.storeAttachments(PaymentAttachment.ReferenceType.CUSTOMER_ADVANCE, advance.getId(),
                attachments == null ? Collections.emptyList() : attachments);
        return toCustomerAdvancePaymentDTO(advance);
    }

    @Override
    public CustomerAdvancePaymentDTO updateCustomerAdvanceStatus(Long id, CustomerAdvanceStatusUpdateRequest req) {
        CustomerAdvancePayment advance = customerAdvancePaymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer advance not found"));

        CustomerAdvancePayment.Status targetStatus = req.getStatus();
        if (targetStatus == CustomerAdvancePayment.Status.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot revert customer advance to PENDING");
        }
        if (advance.getStatus() == targetStatus) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer advance already in target status");
        }
        if (!isAllowedCustomerAdvanceTransition(advance.getStatus(), targetStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid customer advance status transition");
        }

        Date now = new Date();
        switch (targetStatus) {
            case SUBMITTED -> {
                advance.setSubmittedAt(now);
                advance.setSubmittedBy(req.getActionUserId());
            }
            case RECONCILED -> {
                advance.setReconciledAt(now);
                advance.setReconciledBy(req.getActionUserId());
            }
            case REJECTED -> {
                advance.setReconciledAt(now);
                advance.setReconciledBy(req.getActionUserId());
            }
        }

        if (req.getNote() != null) {
            advance.setNote(req.getNote());
        }

        advance.setStatus(targetStatus);
        advance = customerAdvancePaymentRepository.save(advance);

        if (targetStatus == CustomerAdvancePayment.Status.RECONCILED) {
            applyCustomerAdvanceReconciliationImpact(advance, req.getActionUserId());
        }

        return toCustomerAdvancePaymentDTO(advance);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerAdvancePaymentDTO> searchCustomerAdvancePayments(String status, Long tripId, Pageable pageable) {
        CustomerAdvancePayment.Status parsedStatus = parseCustomerAdvanceStatus(status);

        if (parsedStatus != null && tripId != null) {
            return customerAdvancePaymentRepository
                    .findByStatusAndTripId(parsedStatus, tripId, pageable)
                    .map(this::toCustomerAdvancePaymentDTO);
        }
        if (parsedStatus != null) {
            return customerAdvancePaymentRepository
                    .findByStatus(parsedStatus, pageable)
                    .map(this::toCustomerAdvancePaymentDTO);
        }
        if (tripId != null) {
            return customerAdvancePaymentRepository
                    .findByTripId(tripId, pageable)
                    .map(this::toCustomerAdvancePaymentDTO);
        }
        return customerAdvancePaymentRepository.findAll(pageable).map(this::toCustomerAdvancePaymentDTO);
    }

    // Driver expense advances

    @Override
    public DriverExpenseAdvanceDTO createDriverExpenseAdvance(DriverExpenseAdvanceRequest req,
                                                              List<MultipartFile> attachments) {
        User driver = findDriverOrThrow(req.getDriverId());

        if (req.getTripId() != null) {
            Trip trip = tripRepository.findById(req.getTripId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tripId"));
            
            if (trip.getStatus() == Trip.TripStatus.DA_HUY) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể tạo phiếu ứng trước cho chuyến đã hủy");
            }
            
            if (trip.getStatus() == Trip.TripStatus.HOAN_THANH) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể tạo phiếu ứng trước cho chuyến đã hoàn thành");
            }

            if (trip.getDriverId() != null && !Objects.equals(trip.getDriverId(), driver.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trip is not assigned to the driver");
            }
        }

        DriverExpenseAdvance advance = DriverExpenseAdvance.builder()
                .driverId(driver.getId())
                .tripId(req.getTripId())
                .amount(req.getAmount())
                .expenseType(req.getExpenseType())
                .status(DriverExpenseAdvance.Status.REQUESTED)
                .requestedBy(req.getRequestedBy())
                .requestedAt(new Date())
                .note(req.getNote())
                .build();

        advance = driverExpenseAdvanceRepository.save(advance);
        attachmentService.storeAttachments(PaymentAttachment.ReferenceType.DRIVER_EXPENSE_ADVANCE, advance.getId(),
                attachments == null ? Collections.emptyList() : attachments);
        return toDriverExpenseAdvanceDTO(advance);
    }

    @Override
    public DriverExpenseAdvanceDTO updateDriverExpenseAdvanceStatus(Long id, DriverExpenseAdvanceStatusUpdateRequest req) {
        DriverExpenseAdvance advance = driverExpenseAdvanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver advance not found"));

        DriverExpenseAdvance.Status targetStatus = req.getStatus();
        if (targetStatus == DriverExpenseAdvance.Status.REQUESTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot revert driver advance to REQUESTED");
        }
        if (advance.getStatus() == targetStatus) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Driver advance already in target status");
        }
        if (!isAllowedDriverAdvanceTransition(advance.getStatus(), targetStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid driver advance status transition");
        }

        User actionUser = resolveActionUser(req.getActionUserId());
        enforceDriverAdvancePrivileges(actionUser, targetStatus);

        Date now = new Date();
        User driver = findDriverOrThrow(advance.getDriverId());

        switch (targetStatus) {
            case APPROVED -> {
                // Bước 1: Admin duyệt cho phép tạm ứng, KHÔNG trừ ví công ty ở đây
                advance.setApprovedAt(now);
                advance.setApprovedBy(actionUser.getId());
            }
            case TRANSFERRED -> {
                // Bước 2: Kế toán xác nhận đã chuyển tiền cho tài xế, trừ ví công ty
                advance.setTransferredAt(now);
                advance.setTransferredBy(actionUser.getId());
                debitCompanyWallet(advance.getAmount(),
                        "Chuyển tiền tạm ứng tài xế",
                        PaymentAttachment.ReferenceType.DRIVER_EXPENSE_ADVANCE,
                        advance.getId(),
                        actionUser.getId());
            }
            case DEDUCTED -> {
                advance.setDeductedAt(now);
                advance.setDeductedBy(actionUser.getId());
            }
            case REJECTED -> {
                advance.setRejectionReason(req.getRejectionReason());
                if (advance.getStatus() == DriverExpenseAdvance.Status.TRANSFERRED) {
                    // Đã trừ ví công ty ở bước TRANSFERRED nên khi hủy cần hoàn lại ví công ty
                    creditCompanyWallet(advance.getAmount(),
                            "Hoàn tạm ứng bị từ chối",
                            PaymentAttachment.ReferenceType.DRIVER_EXPENSE_ADVANCE,
                            advance.getId(),
                            actionUser.getId());
                }
            }
        }

        if (req.getNote() != null) {
            advance.setNote(req.getNote());
        }

        advance.setStatus(targetStatus);
        advance = driverExpenseAdvanceRepository.save(advance);
        return toDriverExpenseAdvanceDTO(advance);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DriverExpenseAdvanceDTO> searchDriverExpenseAdvances(Long driverId, String status, Pageable pageable) {
        DriverExpenseAdvance.Status parsedStatus = parseDriverAdvanceStatus(status);

        if (driverId != null && parsedStatus != null) {
            return driverExpenseAdvanceRepository
                    .findByDriverIdAndStatus(driverId, parsedStatus, pageable)
                    .map(this::toDriverExpenseAdvanceDTO);
        }
        if (driverId != null) {
            return driverExpenseAdvanceRepository.findByDriverId(driverId, pageable)
                    .map(this::toDriverExpenseAdvanceDTO);
        }
        if (parsedStatus != null) {
            return driverExpenseAdvanceRepository.findByStatus(parsedStatus, pageable)
                    .map(this::toDriverExpenseAdvanceDTO);
        }
        return driverExpenseAdvanceRepository.findAll(pageable).map(this::toDriverExpenseAdvanceDTO);
    }

    // Mapping methods

    private TripPaymentDTO toTripPaymentDTO(TripPayment payment) {
        return TripPaymentDTO.builder()
                .id(payment.getId())
                .tripId(payment.getTripId())
                .driverId(payment.getDriverId())
                .amount(payment.getAmount())
                .method(payment.getMethod())
                .collectedAt(formatDate(payment.getCollectedAt()))
                .attachments(toAttachmentDTOs(PaymentAttachment.ReferenceType.TRIP_PAYMENT, payment.getId()))
                .build();
    }

    private DepositRecordDTO toDepositRecordDTO(DepositRecord deposit) {
        return DepositRecordDTO.builder()
                .id(deposit.getId())
                .driverId(deposit.getDriverId())
                .amount(deposit.getAmount())
                .createdAt(formatDate(deposit.getCreatedAt()))
                .note(deposit.getNote())
                .attachments(toAttachmentDTOs(PaymentAttachment.ReferenceType.DEPOSIT_RECORD, deposit.getId()))
                .build();
    }

    private CustomerAdvancePaymentDTO toCustomerAdvancePaymentDTO(CustomerAdvancePayment advance) {
        return CustomerAdvancePaymentDTO.builder()
                .id(advance.getId())
                .tripId(advance.getTripId())
                .customerName(advance.getCustomerName())
                .customerPhone(advance.getCustomerPhone())
                .amount(advance.getAmount())
                .method(advance.getMethod().name())
                .status(advance.getStatus().name())
                .collectedBy(advance.getCollectedBy())
                .collectedAt(formatDate(advance.getCollectedAt()))
                .submittedBy(advance.getSubmittedBy())
                .submittedAt(formatDate(advance.getSubmittedAt()))
                .reconciledBy(advance.getReconciledBy())
                .reconciledAt(formatDate(advance.getReconciledAt()))
                .receiptCode(advance.getReceiptCode())
                .note(advance.getNote())
                .attachments(toAttachmentDTOs(PaymentAttachment.ReferenceType.CUSTOMER_ADVANCE, advance.getId()))
                .build();
    }

    private DriverExpenseAdvanceDTO toDriverExpenseAdvanceDTO(DriverExpenseAdvance advance) {
        return DriverExpenseAdvanceDTO.builder()
                .id(advance.getId())
                .driverId(advance.getDriverId())
                .tripId(advance.getTripId())
                .amount(advance.getAmount())
                .expenseType(advance.getExpenseType().name())
                .status(advance.getStatus().name())
                .requestedBy(advance.getRequestedBy())
                .requestedAt(formatDate(advance.getRequestedAt()))
                .approvedBy(advance.getApprovedBy())
                .approvedAt(formatDate(advance.getApprovedAt()))
                .deductedBy(advance.getDeductedBy())
                .deductedAt(formatDate(advance.getDeductedAt()))
                .rejectionReason(advance.getRejectionReason())
                .note(advance.getNote())
                .attachments(toAttachmentDTOs(PaymentAttachment.ReferenceType.DRIVER_EXPENSE_ADVANCE, advance.getId()))
                .build();
    }
    
    private void applyCustomerAdvanceReconciliationImpact(CustomerAdvancePayment advance, Long actorId) {
        double amount = Objects.requireNonNullElse(advance.getAmount(), 0.0);
        if (amount <= 0) {
            return;
        }

        Long creditActor = actorId != null ? actorId : advance.getCollectedBy();
        creditCompanyWallet(amount,
                "Đối soát tạm ứng khách",
                PaymentAttachment.ReferenceType.CUSTOMER_ADVANCE,
                advance.getId(),
                creditActor);

        if (advance.getTripId() == null) {
            return;
        }

        tripRepository.findById(advance.getTripId()).ifPresent(trip -> {
            Long driverId = trip.getDriverId();
            if (driverId == null) {
                return;
            }

            userRepository.findByIdAndRole(driverId, com.brostech.transport.jpa.entity.User.UserRole.DRIVER)
                    .ifPresent(driver -> {
                        adjustDriverOutstanding(driver, -amount);
                        userRepository.save(driver);
                    });
        });
    }

    private List<PaymentAttachmentDTO> toAttachmentDTOs(PaymentAttachment.ReferenceType referenceType, Long referenceId) {
        if (referenceId == null) {
            return List.of();
        }
        return attachmentService.getAttachments(referenceType, referenceId).stream()
                .map(attachment -> PaymentAttachmentDTO.builder()
                        .id(attachment.getId())
                        .fileName(attachment.getFileName())
                        .contentType(attachment.getContentType())
                        .sizeBytes(attachment.getSizeBytes())
                        .createdAt(formatDate(attachment.getCreatedAt()))
                        .expiresAt(formatDate(attachment.getExpiresAt()))
                        .downloadUrl(buildAttachmentDownloadUrl(attachment.getId()))
                        .build())
                .collect(Collectors.toList());
    }

    private String buildAttachmentDownloadUrl(Long attachmentId) {
        try {
            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/transport-service/payments/attachments/")
                    .path(attachmentId.toString())
                    .toUriString();
        } catch (IllegalStateException ex) {
            return "/transport-service/payments/attachments/" + attachmentId;
        }
    }

    private String formatDate(Date date) {
        if (date == null) return null;
        return dateFormat.format(date);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountingSummaryDTO getAccountingSummary(String from, String to) {
        Date fromDate = parseDateParam(from, true);
        Date toDate = parseDateParam(to, false);

        List<User> drivers = userRepository.findAllByRole(com.brostech.transport.jpa.entity.User.UserRole.DRIVER);
        double totalCollected = 0;
        double totalDeposited = 0;
        double totalOutstanding = 0;
        double totalCustomerPrepaidPending = sumCustomerAdvances(CustomerAdvancePayment.Status.PENDING);
        double totalCustomerPrepaidSubmitted = sumCustomerAdvances(CustomerAdvancePayment.Status.SUBMITTED);
        double totalCustomerAdvanceReconciledForDrivers = 0;
        double totalDriverAdvanceOutstanding = 0;
        long totalCompletedTrips = 0;
        List<DriverAccountingSummaryDTO> summaries = new ArrayList<>();

        for (User driver : drivers) {
            List<TripPayment> payments = fetchPayments(driver.getId(), fromDate, toDate);
            List<DepositRecord> deposits = fetchDeposits(driver.getId(), fromDate, toDate);
            double driverAdvanceOutstanding = sumDriverAdvances(driver.getId(), List.of(DriverExpenseAdvance.Status.APPROVED));

            double collected = payments.stream().mapToDouble(TripPayment::getAmount).sum();
            double depositAmount = deposits.stream().mapToDouble(DepositRecord::getAmount).sum();
            double reconciledAdvances = sumCustomerAdvancesForDriver(driver.getId(), CustomerAdvancePayment.Status.RECONCILED);
            double grossDeposited = depositAmount + reconciledAdvances;
            double netDeposited = Math.max(grossDeposited - driverAdvanceOutstanding, 0);
            double outstanding = Objects.requireNonNullElse(driver.getOutstandingBalance(), 0.0);
            long completedTrips = countCompletedTrips(driver.getId(), fromDate, toDate);

            totalCollected += collected;
            totalDeposited += netDeposited;
            totalOutstanding += outstanding;
            totalCustomerAdvanceReconciledForDrivers += reconciledAdvances;
            totalDriverAdvanceOutstanding += driverAdvanceOutstanding;
            totalCompletedTrips += completedTrips;

            summaries.add(DriverAccountingSummaryDTO.builder()
                    .driverId(driver.getId())
                    .driverName(driver.getName())
                    .totalCollected(collected)
                    .totalDeposited(netDeposited)
                    .outstanding(outstanding)
                    .completedTrips(completedTrips)
                    .advanceOutstanding(driverAdvanceOutstanding)
                    .build());
        }

        double totalCustomerAdvanceReconciled = sumCustomerAdvances(CustomerAdvancePayment.Status.RECONCILED);
        double reconciledWithoutDriver = totalCustomerAdvanceReconciled - totalCustomerAdvanceReconciledForDrivers;
        if (reconciledWithoutDriver > 0) {
            totalDeposited += reconciledWithoutDriver;
        }

        return AccountingSummaryDTO.builder()
                .totalCollected(totalCollected)
                .totalDeposited(totalDeposited)
                .totalOutstanding(totalOutstanding)
                .totalCompletedTrips(totalCompletedTrips)
                .totalCustomerPrepaidPending(totalCustomerPrepaidPending)
                .totalCustomerPrepaidSubmitted(totalCustomerPrepaidSubmitted)
                .totalDriverAdvanceOutstanding(totalDriverAdvanceOutstanding)
                .byDriver(summaries)
                .build();
    }

    private List<TripPayment> fetchPayments(Long driverId, Date from, Date to) {
        if (from != null && to != null) {
            return tripPaymentRepository.findByDriverIdAndCollectedAtBetween(driverId, from, to);
        }
        if (from != null || to != null) {
            return tripPaymentRepository.findByDriverId(driverId).stream()
                    .filter(payment -> isWithin(payment.getCollectedAt(), from, to))
                    .collect(Collectors.toList());
        }
        return tripPaymentRepository.findByDriverId(driverId);
    }

    private List<DepositRecord> fetchDeposits(Long driverId, Date from, Date to) {
        if (from != null && to != null) {
            return depositRecordRepository.findByDriverIdAndCreatedAtBetween(driverId, from, to);
        }
        if (from != null || to != null) {
            return depositRecordRepository.findByDriverId(driverId).stream()
                    .filter(record -> isWithin(record.getCreatedAt(), from, to))
                    .collect(Collectors.toList());
        }
        return depositRecordRepository.findByDriverId(driverId);
    }

    private double sumCustomerAdvances(CustomerAdvancePayment.Status status) {
        return customerAdvancePaymentRepository.findByStatus(status).stream()
                .mapToDouble(CustomerAdvancePayment::getAmount)
                .sum();
    }

    private double sumCustomerAdvancesForDriver(Long driverId, CustomerAdvancePayment.Status status) {
        if (driverId == null) {
            return 0;
        }
        Double total = customerAdvancePaymentRepository.sumAmountByDriverIdAndStatus(driverId, status);
        return total != null ? total : 0;
    }

    private double sumDriverAdvances(Long driverId, Collection<DriverExpenseAdvance.Status> statuses) {
        return driverExpenseAdvanceRepository.findByDriverIdAndStatusIn(driverId, statuses).stream()
                .mapToDouble(DriverExpenseAdvance::getAmount)
                .sum();
    }

    private long countCompletedTrips(Long driverId, Date from, Date to) {
        if (from != null && to != null) {
            return tripRepository.countByDriverIdAndStatusAndPickupTimeBetween(driverId, Trip.TripStatus.HOAN_THANH, from, to);
        }
        if (from != null || to != null) {
            return tripRepository.findByDriverIdAndStatus(driverId, Trip.TripStatus.HOAN_THANH).stream()
                    .filter(trip -> isWithin(trip.getPickupTime(), from, to))
                    .count();
        }
        return tripRepository.countByDriverIdAndStatus(driverId, Trip.TripStatus.HOAN_THANH);
    }

    private boolean isWithin(Date value, Date from, Date to) {
        if (value == null) {
            return false;
        }
        if (from != null && value.before(from)) {
            return false;
        }
        if (to != null && value.after(to)) {
            return false;
        }
        return true;
    }

    private Date parseDateParam(String value, boolean startOfDay) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String trimmed = value.trim();
        try {
            if (trimmed.length() == 10) {
                return dateFormat.parse(trimmed + (startOfDay ? " 00:00:00" : " 23:59:59"));
            }
            return dateFormat.parse(trimmed);
        } catch (ParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Use yyyy-MM-dd or yyyy-MM-dd HH:mm:ss");
        }
    }

    private CustomerAdvancePayment.Status parseCustomerAdvanceStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return CustomerAdvancePayment.Status.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid customer advance status");
        }
    }

    private DriverExpenseAdvance.Status parseDriverAdvanceStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return DriverExpenseAdvance.Status.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid driver advance status");
        }
    }

    private boolean isAllowedCustomerAdvanceTransition(CustomerAdvancePayment.Status current, CustomerAdvancePayment.Status target) {
        return switch (current) {
            case PENDING -> target == CustomerAdvancePayment.Status.SUBMITTED || target == CustomerAdvancePayment.Status.REJECTED;
            case SUBMITTED -> target == CustomerAdvancePayment.Status.RECONCILED || target == CustomerAdvancePayment.Status.REJECTED;
            case RECONCILED, REJECTED -> false;
        };
    }

    private boolean isAllowedDriverAdvanceTransition(DriverExpenseAdvance.Status current, DriverExpenseAdvance.Status target) {
        return switch (current) {
            case REQUESTED -> target == DriverExpenseAdvance.Status.APPROVED
                    || target == DriverExpenseAdvance.Status.REJECTED;
            case APPROVED -> target == DriverExpenseAdvance.Status.TRANSFERRED
                    || target == DriverExpenseAdvance.Status.REJECTED;
            case TRANSFERRED -> target == DriverExpenseAdvance.Status.DEDUCTED
                    || target == DriverExpenseAdvance.Status.REJECTED;
            case DEDUCTED, REJECTED -> false;
        };
    }

    private User findDriverOrThrow(Long driverId) {
        return userRepository.findByIdAndRole(driverId, com.brostech.transport.jpa.entity.User.UserRole.DRIVER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid driverId"));
    }

    private void adjustDriverOutstanding(User driver, double delta) {
        double currentOutstanding = Objects.requireNonNullElse(driver.getOutstandingBalance(), 0.0);
        double updated = currentOutstanding + delta;
        if (updated < 0) {
            updated = 0;
        }
        driver.setOutstandingBalance(updated);
    }

    private void creditCompanyWallet(double amount,
                                     String description,
                                     PaymentAttachment.ReferenceType referenceType,
                                     Long referenceId,
                                     Long actorId) {
        if (amount <= 0) {
            return;
        }
        CompanyWallet wallet = resolveDefaultWallet();
        double currentBalance = Objects.requireNonNullElse(wallet.getBalance(), 0.0);
        double newBalance = currentBalance + amount;
        wallet.setBalance(newBalance);
        companyWalletRepository.save(wallet);

        CompanyTransaction transaction = CompanyTransaction.builder()
                .walletId(wallet.getId())
                .amount(amount)
                .transactionType(CompanyTransaction.TransactionType.INCOME)
                .referenceType(referenceType.name())
                .referenceId(referenceId)
                .description(description)
                .createdBy(actorId)
                .balanceAfter(newBalance)
                .build();
        companyTransactionRepository.save(transaction);
    }

    private void enforceDriverAdvancePrivileges(User actionUser, DriverExpenseAdvance.Status targetStatus) {
        if (targetStatus == DriverExpenseAdvance.Status.APPROVED || targetStatus == DriverExpenseAdvance.Status.REJECTED) {
            // Admin duyệt hoặc từ chối yêu cầu tạm ứng
            requireAdmin(actionUser);
            return;
        }
        if (targetStatus == DriverExpenseAdvance.Status.TRANSFERRED) {
            // Kế toán xác nhận đã chuyển tiền cho tài xế
            requireAccountant(actionUser);
            return;
        }
        if (targetStatus == DriverExpenseAdvance.Status.DEDUCTED) {
            // Khi khấu trừ tạm ứng với tài xế có thể do Admin hoặc Kế toán thực hiện
            requireAdminOrAccountant(actionUser);
        }
    }

    private User resolveActionUser(Long actionUserId) {
        if (actionUserId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "actionUserId is required");
        }
        return userRepository.findById(actionUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Action user not found"));
    }

    private void requireAdmin(User user) {
        if (user.getRole() != User.UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được duyệt phiếu tạm ứng");
        }
    }

    private void requireAccountant(User user) {
        if (user.getRole() != User.UserRole.ACCOUNTANT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ kế toán mới được xác nhận đã chuyển tiền tạm ứng");
        }
    }

    private void requireAdminOrAccountant(User user) {
        if (user.getRole() != User.UserRole.ADMIN && user.getRole() != User.UserRole.ACCOUNTANT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin hoặc kế toán được quyền hoàn tất khấu trừ");
        }
    }

    private CompanyWallet resolveDefaultWallet() {
        return companyWalletRepository.findAll().stream()
                .findFirst()
                .orElseGet(this::createDefaultWallet);
    }

    private void debitCompanyWallet(double amount,
                                    String description,
                                    PaymentAttachment.ReferenceType referenceType,
                                    Long referenceId,
                                    Long actorId) {
        if (amount <= 0) {
            return;
        }
        CompanyWallet wallet = resolveDefaultWallet();
        double currentBalance = Objects.requireNonNullElse(wallet.getBalance(), 0.0);
        double newBalance = currentBalance - amount;
        wallet.setBalance(newBalance);
        companyWalletRepository.save(wallet);

        CompanyTransaction transaction = CompanyTransaction.builder()
                .walletId(wallet.getId())
                .amount(amount)
                .transactionType(CompanyTransaction.TransactionType.EXPENSE)
                .referenceType(referenceType.name())
                .referenceId(referenceId)
                .description(description)
                .createdBy(actorId)
                .balanceAfter(newBalance)
                .build();
        companyTransactionRepository.save(transaction);
    }

    private CompanyWallet createDefaultWallet() {
        CompanyWallet wallet = CompanyWallet.builder()
                .name("Quy chính")
                .balance(0.0)
                .currency("VND")
                .description("Ví tiền mặt mặc định")
                .build();
        return companyWalletRepository.save(wallet);
    }
}
