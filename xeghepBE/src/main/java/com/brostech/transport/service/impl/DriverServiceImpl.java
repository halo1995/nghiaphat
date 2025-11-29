package com.brostech.transport.service.impl;

import com.brostech.transport.dto.driver.DriverDTO;
import com.brostech.transport.dto.driver.DriverRequest;
import com.brostech.transport.jpa.entity.User;
import com.brostech.transport.jpa.repository.UserRepository;
import com.brostech.transport.jpa.repository.TripRepository;
import com.brostech.transport.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

/**
 * DriverServiceImpl
 * Nghiệp vụ: Quản lý tài xế (tạo, tìm kiếm theo từ khóa, cập nhật thông tin và trạng thái, xóa).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class DriverServiceImpl implements DriverService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TripRepository tripRepository;
    private final com.brostech.transport.jpa.repository.TripPaymentRepository tripPaymentRepository;
    private final com.brostech.transport.jpa.repository.DepositRecordRepository depositRecordRepository;
    
    private final SimpleDateFormat dateTimeFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    private final SimpleDateFormat dateOnlyFormat = new SimpleDateFormat("yyyy-MM-dd");
    
    private Date parseDate(String dateString) {
        if (dateString == null || dateString.trim().isEmpty()) {
            return null;
        }
        try {
            if (dateString.trim().length() == 10) {
                return dateOnlyFormat.parse(dateString.trim());
            }
            return dateTimeFormat.parse(dateString.trim());
        } catch (ParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Use yyyy-MM-dd or yyyy-MM-dd HH:mm:ss");
        }
    }

    /**
     * Tạo mới tài xế
     * @param req dữ liệu tài xế (tên, SĐT, GPLX, trạng thái)
     * @return DriverDTO đã lưu
     */
    @Override
    public DriverDTO create(DriverRequest req) {
        validateUsername(req.getUsername(), null);
        if (!StringUtils.hasText(req.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password is required");
        }

        User user = User.builder()
                .username(req.getUsername().trim())
                .password(req.getPassword())
                .name(req.getName())
                .role(User.UserRole.DRIVER)
                .email(req.getEmail())
                .phone(req.getPhone())
                .licenseNumber(req.getLicenseNumber())
                .licenseExpiry(parseDate(req.getLicenseExpiry()))
                .address(req.getAddress())
                .dateOfBirth(parseDate(req.getDateOfBirth()))
                .joinDate(parseDate(req.getJoinDate()))
                .vehicleId(req.getVehicleId())
                .build();
        if (req.getStatus() != null) {
            user.setDriverStatus(req.getStatus());
        }

        user = userRepository.save(user);
        return toDTO(user);
    }

    /**
     * Lấy chi tiết tài xế theo id
     * @param id id tài xế
     * @return DriverDTO; ném 404 nếu không tồn tại
     */
    @Override
    @Transactional(readOnly = true)
    public DriverDTO getById(Long id) {
        User driver = findDriver(id);
        return toDTO(driver);
    }

    /**
     * Tìm kiếm tài xế theo tên (phân trang)
     * @param keyword từ khóa tên (không phân biệt hoa thường)
     * @param pageable thông tin phân trang
     */
    @Override
    @Transactional(readOnly = true)
    public Page<DriverDTO> search(String keyword, Pageable pageable) {
        if (!StringUtils.hasText(keyword)) {
            return userRepository.findByRole(User.UserRole.DRIVER, pageable).map(this::toDTO);
        }
        return userRepository.findByRoleAndNameContainingIgnoreCase(User.UserRole.DRIVER, keyword.trim(), pageable)
                .map(this::toDTO);
    }

    /**
     * Cập nhật thông tin tài xế
     * @param id id tài xế
     * @param req dữ liệu cập nhật
     */
    @Override
    public DriverDTO update(Long id, DriverRequest req) {
        User driver = findDriver(id);
        validateUsername(req.getUsername(), driver.getUsername());

        driver.setUsername(req.getUsername().trim());
        if (StringUtils.hasText(req.getPassword())) {
            driver.setPassword(req.getPassword());
        }
        driver.setName(req.getName());
        driver.setPhone(req.getPhone());
        driver.setEmail(req.getEmail());
        driver.setLicenseNumber(req.getLicenseNumber());
        driver.setLicenseExpiry(parseDate(req.getLicenseExpiry()));
        driver.setAddress(req.getAddress());
        driver.setDateOfBirth(parseDate(req.getDateOfBirth()));
        Date joinDate = parseDate(req.getJoinDate());
        if (joinDate != null) {
            driver.setJoinDate(joinDate);
        }
        if (req.getStatus() != null) {
            driver.setDriverStatus(req.getStatus());
        }
        driver.setVehicleId(req.getVehicleId());

        driver = userRepository.save(driver);
        return toDTO(driver);
    }

    /**
     * Xóa tài xế theo id
     * @param id id tài xế
     */
    @Override
    public void delete(Long id) {
        User driver = findDriver(id);
        userRepository.delete(driver);
    }

    /**
     * Map entity Driver sang DTO
     */
    private DriverDTO toDTO(User driver) {
        return DriverDTO.builder()
                .id(driver.getId())
                .username(driver.getUsername())
                .name(driver.getName())
                .phone(driver.getPhone())
                .email(driver.getEmail())
                .licenseNumber(driver.getLicenseNumber())
                .licenseExpiry(formatDate(driver.getLicenseExpiry()))
                .address(driver.getAddress())
                .dateOfBirth(formatDate(driver.getDateOfBirth()))
                .joinDate(formatDate(driver.getJoinDate()))
                .status(driver.getDriverStatus() != null ? driver.getDriverStatus() : User.DriverStatus.HOAT_DONG)
                .vehicleId(driver.getVehicleId())
                .totalTrips(driver.getTotalTrips())
                .rating(driver.getRating())
                .totalEarnings(driver.getTotalEarnings())
                .outstandingBalance(driver.getOutstandingBalance())
                .build();
    }
    
    private String formatDate(Date date) {
        if (date == null) return null;
        return dateTimeFormat.format(date);
    }

    private User findDriver(Long id) {
        return userRepository.findByIdAndRole(id, User.UserRole.DRIVER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found"));
    }

    private void validateUsername(String username, String currentUsername) {
        if (!StringUtils.hasText(username)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username is required");
        }
        String normalized = username.trim();
        if (!normalized.equals(currentUsername) && userRepository.existsByUsername(normalized)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username đã tồn tại");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Object getDailySummary(Long driverId, String date) {
        User driver = findDriver(driverId);

        // Parse date and create date range for the entire day
        java.time.LocalDate localDate;
        try {
            localDate = java.time.LocalDate.parse(date);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Use yyyy-MM-dd");
        }

        // Create start and end of day timestamps
        Date startOfDay = Date.from(localDate.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant());
        Date endOfDay = Date.from(localDate.plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant());

        // Query database directly for completed trips on this date
        List<com.brostech.transport.jpa.entity.Trip> trips = tripRepository
                .findByDriverIdAndStatusAndCompletedAtBetween(
                        driverId,
                        com.brostech.transport.jpa.entity.Trip.TripStatus.HOAN_THANH,
                        startOfDay,
                        endOfDay
                );

        // Get all trip IDs to query deposits
        List<Long> tripIds = trips.stream()
                .map(com.brostech.transport.jpa.entity.Trip::getId)
                .collect(java.util.stream.Collectors.toList());

        // Query all deposits for these trips (money driver deposited back to company)
        List<com.brostech.transport.jpa.entity.DepositRecord> allDeposits = depositRecordRepository.findAll().stream()
                .filter(d -> d.getTripId() != null && tripIds.contains(d.getTripId()))
                .collect(java.util.stream.Collectors.toList());

        // Calculate deposited amount per trip
        java.util.Map<Long, Double> depositedPerTrip = new java.util.HashMap<>();
        for (com.brostech.transport.jpa.entity.DepositRecord deposit : allDeposits) {
            depositedPerTrip.merge(deposit.getTripId(), deposit.getAmount(), Double::sum);
        }
        
        List<com.brostech.transport.dto.driver.DriverDailySummaryDTO.TripSummary> tripSummaries = trips.stream()
                .map(trip -> {
                    double amount = trip.getPrice().doubleValue();
                    double alreadyDeposited = depositedPerTrip.getOrDefault(trip.getId(), 0.0);
                    
                    return com.brostech.transport.dto.driver.DriverDailySummaryDTO.TripSummary.builder()
                            .tripId(trip.getId())
                            .pickupLocation(trip.getPickupLocation())
                            .dropoffLocation(trip.getDropoffLocation())
                            .amount(amount)
                            .status(trip.getStatus().name())
                            .alreadyPaid(alreadyDeposited) // Amount already deposited back to company
                            .build();
                })
                .collect(java.util.stream.Collectors.toList());

        double expectedAmount = tripSummaries.stream()
                .mapToDouble(com.brostech.transport.dto.driver.DriverDailySummaryDTO.TripSummary::getAmount)
                .sum();

        // Get current outstanding balance to show overall debt status
        double currentOutstanding = driver.getOutstandingBalance() != null ? driver.getOutstandingBalance() : 0.0;

        return com.brostech.transport.dto.driver.DriverDailySummaryDTO.builder()
                .driverId(driverId)
                .driverName(driver.getName())
                .date(date)
                .expectedAmount(expectedAmount)
                .trips(tripSummaries)
                .build();
    }
}
