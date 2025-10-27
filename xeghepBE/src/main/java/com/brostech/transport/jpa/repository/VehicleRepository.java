package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.Vehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    Optional<Vehicle> findByLicensePlate(String licensePlate);
    boolean existsByLicensePlate(String licensePlate);
    Page<Vehicle> findByLicensePlateContainingIgnoreCase(String keyword, Pageable pageable);
}
