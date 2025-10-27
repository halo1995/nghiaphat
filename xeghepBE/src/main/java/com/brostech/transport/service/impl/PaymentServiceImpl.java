package com.brostech.transport.service.impl;

import com.brostech.transport.dto.payment.AccountingSummaryDTO;
import com.brostech.transport.dto.payment.DepositRecordDTO;
import com.brostech.transport.dto.payment.DepositRecordRequest;
import com.brostech.transport.dto.payment.DriverAccountingSummaryDTO;
import com.brostech.transport.dto.payment.TripPaymentDTO;
import com.brostech.transport.dto.payment.TripPaymentRequest;
import com.brostech.transport.jpa.entity.DepositRecord;
import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.entity.TripPayment;
import com.brostech.transport.jpa.entity.User;
import com.brostech.transport.jpa.repository.DepositRecordRepository;
import com.brostech.transport.jpa.repository.TripPaymentRepository;
import com.brostech.transport.jpa.repository.TripRepository;
import com.brostech.transport.jpa.repository.UserRepository;
import com.brostech.transport.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
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
    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    // Trip Payments

    @Override
    public TripPaymentDTO createTripPayment(TripPaymentRequest req) {
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

        double currentOutstanding = Objects.requireNonNullElse(driver.getOutstandingBalance(), 0.0);
        driver.setOutstandingBalance(currentOutstanding + req.getAmount());
        double currentEarnings = Objects.requireNonNullElse(driver.getTotalEarnings(), 0.0);
        driver.setTotalEarnings(currentEarnings + req.getAmount());
        userRepository.save(driver);
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
        userRepository.findByIdAndRole(payment.getDriverId(), com.brostech.transport.jpa.entity.User.UserRole.DRIVER)
                .ifPresent(driver -> {
                    double currentOutstanding = Objects.requireNonNullElse(driver.getOutstandingBalance(), 0.0);
                    double updatedOutstanding = currentOutstanding - payment.getAmount();
                    if (updatedOutstanding < 0) {
                        updatedOutstanding = 0;
                    }
                    driver.setOutstandingBalance(updatedOutstanding);
                    double currentEarnings = Objects.requireNonNullElse(driver.getTotalEarnings(), 0.0);
                    double updatedEarnings = currentEarnings - payment.getAmount();
                    driver.setTotalEarnings(Math.max(updatedEarnings, 0));
                    userRepository.save(driver);
                });
    }

    // Deposit Records

    @Override
    public DepositRecordDTO createDepositRecord(DepositRecordRequest req) {
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
        double currentOutstanding = Objects.requireNonNullElse(driver.getOutstandingBalance(), 0.0);
        double updatedOutstanding = currentOutstanding - req.getAmount();
        if (updatedOutstanding < 0) {
            updatedOutstanding = 0;
        }
        driver.setOutstandingBalance(updatedOutstanding);
        userRepository.save(driver);
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
        userRepository.findByIdAndRole(deposit.getDriverId(), com.brostech.transport.jpa.entity.User.UserRole.DRIVER)
                .ifPresent(driver -> {
                    double currentOutstanding = Objects.requireNonNullElse(driver.getOutstandingBalance(), 0.0);
                    driver.setOutstandingBalance(currentOutstanding + deposit.getAmount());
                    userRepository.save(driver);
                });
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
                .build();
    }

    private DepositRecordDTO toDepositRecordDTO(DepositRecord deposit) {
        return DepositRecordDTO.builder()
                .id(deposit.getId())
                .driverId(deposit.getDriverId())
                .amount(deposit.getAmount())
                .createdAt(formatDate(deposit.getCreatedAt()))
                .note(deposit.getNote())
                .build();
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
        long totalCompletedTrips = 0;
        List<DriverAccountingSummaryDTO> summaries = new ArrayList<>();

        for (User driver : drivers) {
            List<TripPayment> payments = fetchPayments(driver.getId(), fromDate, toDate);
            List<DepositRecord> deposits = fetchDeposits(driver.getId(), fromDate, toDate);

            double collected = payments.stream().mapToDouble(TripPayment::getAmount).sum();
            double deposited = deposits.stream().mapToDouble(DepositRecord::getAmount).sum();
            double outstanding = Objects.requireNonNullElse(driver.getOutstandingBalance(), 0.0);
            long completedTrips = countCompletedTrips(driver.getId(), fromDate, toDate);

            totalCollected += collected;
            totalDeposited += deposited;
            totalOutstanding += outstanding;
            totalCompletedTrips += completedTrips;

            summaries.add(DriverAccountingSummaryDTO.builder()
                    .driverId(driver.getId())
                    .driverName(driver.getName())
                    .totalCollected(collected)
                    .totalDeposited(deposited)
                    .outstanding(outstanding)
                    .completedTrips(completedTrips)
                    .build());
        }

        return AccountingSummaryDTO.builder()
                .totalCollected(totalCollected)
                .totalDeposited(totalDeposited)
                .totalOutstanding(totalOutstanding)
                .totalCompletedTrips(totalCompletedTrips)
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
}
