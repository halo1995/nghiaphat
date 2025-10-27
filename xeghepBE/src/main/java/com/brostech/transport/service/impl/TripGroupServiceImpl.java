package com.brostech.transport.service.impl;

import com.brostech.transport.dto.trip.TripGroupDTO;
import com.brostech.transport.dto.trip.TripGroupRequest;
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
import java.util.Date;

/**
 * TripGroupServiceImpl
 * Nghiệp vụ: Quản lý nhóm ghép chuyến (tạo, phân công xe/tài xế, thêm/bớt chuyến).
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
    public Page<TripGroupDTO> search(String status, Pageable pageable) {
        if (status == null || status.isBlank()) {
            return tripGroupRepository.findAll(pageable).map(this::toDTO);
        }
        TripGroup.GroupStatus parsed;
        try {
            parsed = TripGroup.GroupStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status value");
        }
        return tripGroupRepository.findByStatus(parsed, pageable).map(this::toDTO);
    }

    @Override
    public TripGroupDTO update(Long id, TripGroupRequest req) {
        TripGroup group = tripGroupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));

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
        
        group = tripGroupRepository.save(group);
        return toDTO(group);
    }

    @Override
    public void delete(Long id) {
        if (!tripGroupRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found");
        }
        tripGroupRepository.deleteById(id);
    }

    @Override
    public TripGroupDTO assignVehicle(Long groupId, Long vehicleId) {
        TripGroup group = tripGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));
        
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
        
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tripId"));
        
        String currentTripIds = group.getTripIds();
        if (currentTripIds == null || currentTripIds.trim().isEmpty()) {
            currentTripIds = tripId.toString();
        } else {
            currentTripIds += "," + tripId;
        }
        
        group.setTripIds(currentTripIds);
        group.setTotalPassengers(group.getTotalPassengers() + trip.getPassengers());
        group.setTotalRevenue(group.getTotalRevenue() + trip.getPrice().doubleValue());
        
        group = tripGroupRepository.save(group);
        return toDTO(group);
    }

    @Override
    public TripGroupDTO removeTrip(Long groupId, Long tripId) {
        TripGroup group = tripGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripGroup not found"));
        
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tripId"));
        
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
            group.setTotalPassengers(Math.max(0, group.getTotalPassengers() - trip.getPassengers()));
            group.setTotalRevenue(Math.max(0, group.getTotalRevenue() - trip.getPrice().doubleValue()));
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
                .build();
    }
    
    private String formatDate(Date date) {
        if (date == null) return null;
        return dateFormat.format(date);
    }
}
