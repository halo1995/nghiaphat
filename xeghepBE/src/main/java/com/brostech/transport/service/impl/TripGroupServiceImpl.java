package com.brostech.transport.service.impl;

import com.brostech.transport.dto.trip.TripGroupDTO;
import com.brostech.transport.dto.trip.TripGroupRequest;
import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.entity.TripGroup;
import com.brostech.transport.jpa.repository.TripGroupRepository;
import com.brostech.transport.jpa.repository.VehicleRepository;
import com.brostech.transport.jpa.repository.TripRepository;
import com.brostech.transport.jpa.repository.UserRepository;
import com.brostech.transport.service.TripGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * TripGroupServiceImpl
 * Nghiệp vụ: Quản lý nhóm ghép chuyến (tạo, phân công xe/tài xế, thêm/bớt
 * chuyến).
 * Quy tắc chính:
 * - Tạo nhóm để ghép nhiều chuyến đi có cùng lộ trình.
 * - Có thể phân công xe, tài xế cho nhóm.
 * - Tính toán tổng số hành khách và doanh thu.
 * - Hỗ trợ các trạng thái: DANG_GHEP/DA_PHAN_XE/DANG_CHAY/HOAN_THANH.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TripGroupServiceImpl implements TripGroupService {

    private final TripGroupRepository tripGroupRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final TripRepository tripRepository;

    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    private static final Set<Trip.TripStatus> DRIVER_CONFIRMED_STATUSES = EnumSet.of(Trip.TripStatus.DANG_DON,
            Trip.TripStatus.DANG_DI, Trip.TripStatus.HOAN_THANH);

    @Override
    public TripGroupDTO create(TripGroupRequest req) {
        TripGroup group = TripGroup.builder()
                .name(req.getName())
                .tripIds(req.getTripIds())
                .vehicleId(req.getVehicleId())
                .vehicleName(req.getVehicleName())
                .driverId(req.getDriverId())
                .driverName(req.getDriverName())
                .status(req.getStatus() != null ? req.getStatus() : TripGroup.GroupStatus.DANG_GHEP)
                .totalPassengers(req.getTotalPassengers())
                .totalRevenue(req.getTotalRevenue())
                .build();

        // Calculate and set pickup date from trips
        java.time.LocalDate pickupDate = calculatePickupDate(parseTripIds(req.getTripIds()));
        group.setPickupDate(pickupDate);

        group = tripGroupRepository.save(group);
        return toDTO(group);
    }

    @Override
    @Transactional(readOnly = true)
    public TripGroupDTO getById(Long id) {
        TripGroup group = tripGroupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));
        return toDTO(group);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TripGroupDTO> search(String status, String date, Pageable pageable) {
        // Parse date if provided
        java.time.LocalDate pickupDate = null;
        if (date != null && !date.isBlank()) {
            try {
                pickupDate = java.time.LocalDate.parse(date.trim());
            } catch (Exception ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Use yyyy-MM-dd");
            }
        }

        // Parse status if provided
        TripGroup.GroupStatus parsed = null;
        if (status != null && !status.isBlank()) {
            try {
                parsed = TripGroup.GroupStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status value");
            }
        }

        // Query based on filters using pickupDate
        if (parsed != null && pickupDate != null) {
            return tripGroupRepository.findByStatusAndPickupDate(parsed, pickupDate, pageable).map(this::toDTO);
        } else if (parsed != null) {
            return tripGroupRepository.findByStatus(parsed, pageable).map(this::toDTO);
        } else if (pickupDate != null) {
            return tripGroupRepository.findByPickupDate(pickupDate, pageable).map(this::toDTO);
        } else {
            return tripGroupRepository.findAll(pageable).map(this::toDTO);
        }
    }

    @Override
    public TripGroupDTO update(Long id, TripGroupRequest req) {
        TripGroup group = tripGroupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));

        assertGroupEditable(group);
        if (req.getTripIds() != null) {
            assertTripIdsEditable(req.getTripIds());
            enforceFullVehicleRule(req.getTripIds());
        }

        group.setName(req.getName());
        group.setTripIds(req.getTripIds());
        group.setVehicleId(req.getVehicleId());
        group.setVehicleName(req.getVehicleName());
        group.setDriverId(req.getDriverId());
        group.setDriverName(req.getDriverName());
        if (req.getStatus() != null) {
            group.setStatus(req.getStatus());
        }
        group.setTotalPassengers(req.getTotalPassengers());
        group.setTotalRevenue(req.getTotalRevenue());

        // Recalculate pickup date when tripIds change
        if (req.getTripIds() != null) {
            java.time.LocalDate pickupDate = calculatePickupDate(parseTripIds(req.getTripIds()));
            group.setPickupDate(pickupDate);
        }

        group = tripGroupRepository.save(group);
        return toDTO(group);
    }

    @Override
    public void delete(Long id) {
        TripGroup group = tripGroupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));
        assertGroupEditable(group);
        tripGroupRepository.deleteById(id);
    }

    @Override
    public TripGroupDTO assignVehicle(Long groupId, Long vehicleId) {
        TripGroup group = tripGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));

        assertGroupEditable(group);

        var vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid vehicleId"));

        group.setVehicleId(vehicleId);
        group.setVehicleName(vehicle.getName());

        group = tripGroupRepository.save(group);
        return toDTO(group);
    }

    @Override
    public TripGroupDTO assignDriver(Long groupId, Long driverId) {
        TripGroup group = tripGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));

        assertGroupEditable(group);

        var driver = userRepository.findByIdAndRole(driverId, com.brostech.transport.jpa.entity.User.UserRole.DRIVER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid driverId"));

        group.setDriverId(driverId);
        group.setDriverName(driver.getName());

        group = tripGroupRepository.save(group);
        return toDTO(group);
    }

    @Override
    public TripGroupDTO addTrip(Long groupId, Long tripId) {
        TripGroup group = tripGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));

        assertGroupEditable(group);

        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tripId"));

        if (Boolean.TRUE.equals(trip.getFullVehicle())) {
            if (hasTrips(group)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Không thể ghép thêm khách vào chuyến thuê nguyên xe");
            }
        } else if (groupContainsFullVehicle(group)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Không thể ghép thêm khách vào chuyến thuê nguyên xe");
        }

        if (Boolean.TRUE.equals(trip.getPickupConfirmed())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể thêm chuyến đã xác nhận đón vào nhóm");
        }

        String currentTripIds = group.getTripIds();
        if (currentTripIds == null || currentTripIds.trim().isEmpty()) {
            currentTripIds = tripId.toString();
        } else {
            currentTripIds += "," + tripId;
        }

        group.setTripIds(currentTripIds);
        group.setTotalPassengers(
                (group.getTotalPassengers() == null ? 0 : group.getTotalPassengers()) + trip.getPassengers());
        group.setTotalRevenue(
                (group.getTotalRevenue() == null ? 0.0 : group.getTotalRevenue()) + trip.getPrice().doubleValue());

        // Update pickup date if new trip has earlier pickup time
        java.time.LocalDate pickupDate = calculatePickupDate(parseTripIds(currentTripIds));
        group.setPickupDate(pickupDate);

        group = tripGroupRepository.save(group);
        return toDTO(group);
    }

    @Override
    public TripGroupDTO removeTrip(Long groupId, Long tripId) {
        TripGroup group = tripGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));

        assertGroupEditable(group);

        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tripId"));

        if (Boolean.TRUE.equals(trip.getFullVehicle())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể tách chuyến thuê nguyên xe khỏi nhóm");
        }

        String currentTripIds = group.getTripIds();
        if (currentTripIds != null && !currentTripIds.trim().isEmpty()) {
            String[] tripIdArray = currentTripIds.split(",");
            StringBuilder newTripIds = new StringBuilder();
            for (String id : tripIdArray) {
                if (!id.trim().equals(tripId.toString())) {
                    if (newTripIds.length() > 0) {
                        newTripIds.append(",");
                    }
                    newTripIds.append(id.trim());
                }
            }
            group.setTripIds(newTripIds.toString());
            group.setTotalPassengers(Math.max(0,
                    (group.getTotalPassengers() == null ? 0 : group.getTotalPassengers()) - trip.getPassengers()));
            group.setTotalRevenue(Math.max(0.0,
                    (group.getTotalRevenue() == null ? 0.0 : group.getTotalRevenue()) - trip.getPrice().doubleValue()));

            // Recalculate pickup date from remaining trips
            java.time.LocalDate pickupDate = calculatePickupDate(parseTripIds(newTripIds.toString()));
            group.setPickupDate(pickupDate);
        }

        group = tripGroupRepository.save(group);
        return toDTO(group);
    }

    private TripGroupDTO toDTO(TripGroup group) {
        return TripGroupDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .tripIds(group.getTripIds())
                .vehicleId(group.getVehicleId())
                .vehicleName(group.getVehicleName())
                .driverId(group.getDriverId())
                .driverName(group.getDriverName())
                .status(group.getStatus())
                .createdAt(formatDate(group.getCreatedAt()))
                .totalPassengers(group.getTotalPassengers())
                .totalRevenue(group.getTotalRevenue())
                .pickupDate(group.getPickupDate() != null ? group.getPickupDate().toString() : null)
                .build();
    }

    private String formatDate(Date date) {
        if (date == null)
            return null;
        return dateFormat.format(date);
    }

    private void assertGroupEditable(TripGroup group) {
        if (group == null) {
            return;
        }
        List<Long> tripIds = parseTripIds(group.getTripIds());
        if (tripIds.isEmpty()) {
            return;
        }
        boolean locked = tripRepository.findAllById(tripIds).stream().anyMatch(this::isTripLocked);
        if (locked) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Không thể chỉnh sửa nhóm sau khi tài xế đã xác nhận đón khách");
        }
    }

    private void assertTripIdsEditable(String tripIds) {
        List<Long> ids = parseTripIds(tripIds);
        if (ids.isEmpty()) {
            return;
        }
        boolean locked = tripRepository.findAllById(ids).stream().anyMatch(this::isTripLocked);
        if (locked) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể thêm chuyến đã xác nhận đón vào nhóm");
        }
    }

    private void enforceFullVehicleRule(String tripIds) {
        List<Long> ids = parseTripIds(tripIds);
        if (ids.isEmpty()) {
            return;
        }
        List<Trip> trips = tripRepository.findAllById(ids);
        long fullVehicleCount = trips.stream()
                .filter(trip -> Boolean.TRUE.equals(trip.getFullVehicle()))
                .count();
        if (fullVehicleCount > 0 && trips.size() > 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Không thể ghép thêm khách vào chuyến thuê nguyên xe");
        }
    }

    private boolean hasTrips(TripGroup group) {
        return group.getTripIds() != null && !group.getTripIds().trim().isEmpty();
    }

    private boolean groupContainsFullVehicle(TripGroup group) {
        if (!hasTrips(group)) {
            return false;
        }
        List<Long> ids = parseTripIds(group.getTripIds());
        if (ids.isEmpty()) {
            return false;
        }
        return tripRepository.findAllById(ids).stream().anyMatch(trip -> Boolean.TRUE.equals(trip.getFullVehicle()));
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

    private boolean isTripLocked(Trip trip) {
        if (trip == null) {
            return false;
        }
        if (Boolean.TRUE.equals(trip.getPickupConfirmed())) {
            return true;
        }
        Trip.TripStatus status = trip.getStatus();
        return status != null && DRIVER_CONFIRMED_STATUSES.contains(status);
    }

    /**
     * Calculate pickup date from list of trip IDs
     * Returns the earliest pickup date among all trips
     */
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
