package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.Trip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Date;
import java.util.List;

public interface TripRepository extends JpaRepository<Trip, Long> {
    Page<Trip> findByStatus(Trip.TripStatus status, Pageable pageable);
    long countByDriverIdAndStatus(Long driverId, Trip.TripStatus status);
    long countByDriverIdAndStatusAndPickupTimeBetween(Long driverId, Trip.TripStatus status, Date start, Date end);
    List<Trip> findByDriverIdAndStatus(Long driverId, Trip.TripStatus status);
    List<Trip> findByDriverIdAndStatusAndPickupTimeBetween(Long driverId, Trip.TripStatus status, Date start, Date end);
}
