package com.brostech.transport.controller;

import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.entity.TripGroup;
import com.brostech.transport.jpa.repository.TripGroupRepository;
import com.brostech.transport.jpa.repository.TripRepository;
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
public class DataMigrationController {

    private final TripGroupRepository tripGroupRepository;
    private final TripRepository tripRepository;

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
