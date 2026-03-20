package com.brostech.transport.controller;

import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.entity.TripGroup;
import com.brostech.transport.jpa.entity.User;
import com.brostech.transport.jpa.entity.DriverTransaction;
import com.brostech.transport.jpa.repository.TripGroupRepository;
import com.brostech.transport.jpa.repository.TripRepository;
import com.brostech.transport.jpa.repository.UserRepository;
import com.brostech.transport.jpa.repository.DriverTransactionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller for data migration operations
 * This should be used only for one-time data migrations
 * Requires ADMIN role
 */
@RestController
@RequestMapping("/transport-service/admin/migration")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DataMigrationController {

    private final TripGroupRepository tripGroupRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final DriverTransactionRepository driverTransactionRepository;

    /**
     * Migrate existing outstanding balances to the driver_transactions ledger
     * This endpoint should be called once to avoid losing historical debt info
     */
    @PostMapping("/populate-initial-balances")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> populateInitialBalances() {
        List<User> driversWithDebt = userRepository.findAllByRoleAndOutstandingBalanceGreaterThan(User.UserRole.DRIVER, 0.0);
        int updated = 0;

        for (User driver : driversWithDebt) {
            // Check if INITIAL_BALANCE already exists to make it idempotent
            boolean hasInitial = driverTransactionRepository.findByDriverIdAndCreatedAtBetween(driver.getId(), new java.util.Date(0), new java.util.Date())
                    .stream()
                    .anyMatch(tx -> tx.getReferenceType() == DriverTransaction.ReferenceType.INITIAL_BALANCE);

            if (!hasInitial) {
                var tx = DriverTransaction.builder()
                        .driverId(driver.getId())
                        .amount(driver.getOutstandingBalance())
                        .transactionType(DriverTransaction.TransactionType.DEBIT)
                        .referenceType(DriverTransaction.ReferenceType.INITIAL_BALANCE)
                        .description("Migration dư nợ đầu kỳ")
                        .balanceAfter(driver.getOutstandingBalance())
                        .build();
                driverTransactionRepository.save(tx);
                updated++;
            }
        }

        return ResponseEntity.ok(String.format("Successfully populated initial balances for %d drivers", updated));
    }

    /**
     * Populate pickup_date for existing trip groups
     * This endpoint should be called once after adding the pickup_date column
     */
    @PostMapping("/populate-pickup-dates")
    public ResponseEntity<String> populatePickupDates() {
        List<TripGroup> allGroups = tripGroupRepository.findAll();
        int updated = 0;

        for (TripGroup group : allGroups) {
            if (group.getPickupDate() == null && group.getTripIds() != null && !group.getTripIds().trim().isEmpty()) {
                List<Long> tripIds = parseTripIds(group.getTripIds());
                if (!tripIds.isEmpty()) {
                    java.time.LocalDate pickupDate = calculatePickupDate(tripIds);
                    if (pickupDate != null) {
                        group.setPickupDate(pickupDate);
                        tripGroupRepository.save(group);
                        updated++;
                    }
                }
            }
        }

        return ResponseEntity.ok(String.format("Successfully populated pickup_date for %d trip groups", updated));
    }

    private List<Long> parseTripIds(String tripIds) {
        if (tripIds == null || tripIds.trim().isEmpty()) {
            return List.of();
        }
        return Arrays.stream(tripIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(Long::valueOf)
                .collect(Collectors.toList());
    }

    private java.time.LocalDate calculatePickupDate(List<Long> tripIds) {
        if (tripIds == null || tripIds.isEmpty()) {
            return null;
        }
        List<Trip> trips = tripRepository.findAllById(tripIds);
        return trips.stream()
                .map(Trip::getPickupTime)
                .filter(pickupTime -> pickupTime != null)
                .map(pickupTime -> new java.sql.Date(pickupTime.getTime()).toLocalDate())
                .min(java.time.LocalDate::compareTo)
                .orElse(null);
    }
}
