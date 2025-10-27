package com.brostech.transport.service.impl;

import com.brostech.transport.dto.vehicle.VehicleDTO;
import com.brostech.transport.dto.vehicle.VehicleRequest;
import com.brostech.transport.jpa.entity.Vehicle;
import com.brostech.transport.jpa.repository.VehicleRepository;
import com.brostech.transport.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.TemporalType;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * VehicleServiceImpl
 * Nghiệp vụ: Quản lý phương tiện (tạo, tìm kiếm theo biển số, cập nhật, xóa) và kiểm tra trùng biển số.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;
    
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    
    private Date parseDate(String dateString) {
        if (dateString == null || dateString.trim().isEmpty()) {
            return null;
        }
        try {
            return dateFormat.parse(dateString);
        } catch (ParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Use yyyy-MM-dd HH:mm:ss");
        }
    }

    /**
     * Tạo mới phương tiện, chặn trùng biển số.
     * @param req dữ liệu xe (biển số, loại xe, sức chứa, trạng thái)
     * @return VehicleDTO đã lưu
     */
    @Override
    public VehicleDTO create(VehicleRequest req) {
        if (vehicleRepository.existsByLicensePlate(req.getLicensePlate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "License plate already exists");
        }
        Vehicle vehicle = Vehicle.builder()
                .name(req.getName())
                .brand(req.getBrand())
                .model(req.getModel())
                .year(req.getYear())
                .licensePlate(req.getLicensePlate())
                .color(req.getColor())
                .seats(req.getSeats())
                .fuelType(req.getFuelType())
                .status(req.getStatus())
                .mileage(req.getMileage())
                .lastMaintenance(parseDate(req.getLastMaintenance()))
                .nextMaintenance(parseDate(req.getNextMaintenance()))
                .image(req.getImage())
                .build();
        vehicle = vehicleRepository.save(vehicle);
        return toDTO(vehicle);
    }

    /**
     * Lấy chi tiết phương tiện theo id
     * @param id id xe
     * @return VehicleDTO; ném 404 nếu không có
     */
    @Override
    @Transactional(readOnly = true)
    public VehicleDTO getById(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found"));
        return toDTO(vehicle);
    }

    /**
     * Tìm kiếm phương tiện theo biển số (phân trang)
     * @param keyword từ khóa biển số
     * @param pageable thông tin phân trang
     */
    @Override
    @Transactional(readOnly = true)
    public Page<VehicleDTO> search(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isBlank()) {
            return vehicleRepository.findAll(pageable).map(this::toDTO);
        }
        return vehicleRepository.findByLicensePlateContainingIgnoreCase(keyword, pageable).map(this::toDTO);
    }

    /**
     * Cập nhật phương tiện; nếu thay đổi biển số thì chặn trùng với xe khác
     * @param id id xe
     * @param req dữ liệu cập nhật
     */
    @Override
    public VehicleDTO update(Long id, VehicleRequest req) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found"));
        if (!vehicle.getLicensePlate().equals(req.getLicensePlate())
                && vehicleRepository.existsByLicensePlate(req.getLicensePlate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "License plate already exists");
        }
        vehicle.setName(req.getName());
        vehicle.setBrand(req.getBrand());
        vehicle.setModel(req.getModel());
        vehicle.setYear(req.getYear());
        vehicle.setLicensePlate(req.getLicensePlate());
        vehicle.setColor(req.getColor());
        vehicle.setSeats(req.getSeats());
        vehicle.setFuelType(req.getFuelType());
        vehicle.setStatus(req.getStatus());
        vehicle.setMileage(req.getMileage());
        vehicle.setLastMaintenance(parseDate(req.getLastMaintenance()));
        vehicle.setNextMaintenance(parseDate(req.getNextMaintenance()));
        vehicle.setImage(req.getImage());
        vehicle = vehicleRepository.save(vehicle);
        return toDTO(vehicle);
    }

    /**
     * Xóa phương tiện theo id
     * @param id id xe
     */
    @Override
    public void delete(Long id) {
        if (!vehicleRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found");
        }
        vehicleRepository.deleteById(id);
    }

    /**
     * Map entity Vehicle sang DTO
     */
    private VehicleDTO toDTO(Vehicle vehicle) {
        return VehicleDTO.builder()
                .id(vehicle.getId())
                .name(vehicle.getName())
                .brand(vehicle.getBrand())
                .model(vehicle.getModel())
                .year(vehicle.getYear())
                .licensePlate(vehicle.getLicensePlate())
                .color(vehicle.getColor())
                .seats(vehicle.getSeats())
                .fuelType(vehicle.getFuelType())
                .status(vehicle.getStatus())
                .mileage(vehicle.getMileage())
                .lastMaintenance(formatDate(vehicle.getLastMaintenance()))
                .nextMaintenance(formatDate(vehicle.getNextMaintenance()))
                .image(vehicle.getImage())
                .totalTrips(vehicle.getTotalTrips())
                .rating(vehicle.getRating())
                .build();
    }
    
    private String formatDate(Date date) {
        if (date == null) return null;
        return dateFormat.format(date);
    }
}
