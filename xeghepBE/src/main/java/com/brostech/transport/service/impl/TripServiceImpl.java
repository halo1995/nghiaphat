package com.brostech.transport.service.impl;

import com.brostech.transport.dto.payment.TripPaymentRequest;
import com.brostech.transport.dto.trip.TripDTO;
import com.brostech.transport.dto.trip.TripRequest;
import com.brostech.transport.dto.trip.TripStatusHistoryDTO;
import com.brostech.transport.jpa.entity.Customer;
import com.brostech.transport.jpa.entity.CustomerAdvancePayment;
import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.entity.TripGroup;
import com.brostech.transport.jpa.entity.TripPayment;
import com.brostech.transport.jpa.repository.CustomerAdvancePaymentRepository;
import com.brostech.transport.jpa.repository.CustomerRepository;
import com.brostech.transport.jpa.repository.TripGroupRepository;
import com.brostech.transport.jpa.repository.TripPaymentRepository;
import com.brostech.transport.jpa.repository.TripRepository;
import com.brostech.transport.jpa.repository.TripStatusHistoryRepository;
import com.brostech.transport.jpa.repository.VehicleRepository;
import com.brostech.transport.jpa.entity.TripStatusHistory;
import com.brostech.transport.service.PaymentService;
import com.brostech.transport.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;

/**
 * TripServiceImpl
 * Nghiệp vụ: Quản lý chuyến đi (tạo, tìm kiếm theo trạng thái, cập nhật thông
 * tin, xóa).
 * Quy tắc chính:
 * - Quản lý thông tin khách hàng, địa điểm đón/trả, thời gian, giá vé.
 * - Sử dụng vehicleId, driverId thay vì relationships để đơn giản.
 * - Trạng thái chuyến dùng enum TripStatus:
 * CHO_XAC_NHAN/DA_XAC_NHAN/DA_GHEP_CHUYEN/v.v.
 * - Hỗ trợ lọc theo trạng thái để màn hình điều phối.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TripServiceImpl implements TripService {

    private final TripRepository tripRepository;
    private final CustomerRepository customerRepository;
    private final VehicleRepository vehicleRepository;
    private final TripPaymentRepository tripPaymentRepository;
    private final PaymentService paymentService;
    private final CustomerAdvancePaymentRepository customerAdvancePaymentRepository;
    private final TripGroupRepository tripGroupRepository;
    private final TripStatusHistoryRepository tripStatusHistoryRepository;

    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    /**
     * Tạo mới Trip.
     * - Kiểm tra hợp lệ customer theo id.
     * - Parse các thông tin thời gian từ chuỗi.
     * - Trạng thái mặc định CHO_XAC_NHAN nếu không truyền.
     * 
     * @param req dữ liệu tạo chuyến
     * @return TripDTO đã lưu
     */
    @Override
    public TripDTO create(TripRequest req) {
        Customer customer = resolveCustomer(req);
        String customerName = StringUtils.hasText(req.getCustomerName())
                ? req.getCustomerName().trim()
                : (StringUtils.hasText(customer.getName()) ? customer.getName() : customer.getPhone());
        String customerPhone = StringUtils.hasText(customer.getPhone())
                ? customer.getPhone()
                : req.getCustomerPhone();
        if (!StringUtils.hasText(customerPhone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerPhone is required");
        }
        customerPhone = customerPhone.trim();
        if (StringUtils.hasText(customerName)) {
            customerName = customerName.trim();
        } else {
            customerName = customerPhone;
        }

        Trip trip = Trip.builder()
                .vehicleId(req.getVehicleId())
                .vehicleName(req.getVehicleName())
                .driverId(req.getDriverId())
                .driverName(req.getDriverName())
                .customerName(customerName)
                .customerPhone(customerPhone)
                .pickupLocation(req.getPickupLocation())
                .pickupProvinceCode(req.getPickupProvinceCode())
                .pickupWardCode(req.getPickupWardCode())
                .dropoffLocation(req.getDropoffLocation())
                .dropoffProvinceCode(req.getDropoffProvinceCode())
                .dropoffWardCode(req.getDropoffWardCode())
                .pickupTime(parseDate(req.getPickupTime()))
                .dropoffTime(parseDate(req.getDropoffTime()))
                .distance(req.getDistance())
                .price(req.getPrice())
                .passengers(req.getPassengers())
                .notes(req.getNotes())
                .status(req.getStatus() != null ? req.getStatus() : Trip.TripStatus.CHO_XAC_NHAN)
                .fullVehicle(Boolean.TRUE.equals(req.getFullVehicle()))
                .build();
        trip.setAssignedAt(parseDate(req.getAssignedAt()));
        trip.setStartedAt(parseDate(req.getStartedAt()));
        trip.setCompletedAt(parseDate(req.getCompletedAt()));
        if (req.getPickupConfirmed() != null) {
            trip.setPickupConfirmed(req.getPickupConfirmed());
        }
        if (req.getDropoffConfirmed() != null) {
            trip.setDropoffConfirmed(req.getDropoffConfirmed());
        }
        if (req.getGroupId() != null) {
            trip.setGroupId(req.getGroupId());
        }
        trip.setStatus(normalizeStatusForFullVehicle(trip, trip.getStatus()));
        trip = tripRepository.save(trip);
        recordStatusHistory(trip.getId(), null, trip.getStatus(), null);
        trip = ensureTripGroupForFullVehicle(trip);
        autoRecordDriverCollection(trip, null);
        return toDTO(trip);
    }

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
     * Lấy chi tiết Trip theo id.
     * 
     * @param id id chuyến
     * @return TripDTO; ném 404 nếu không có
     */
    @Override
    @Transactional(readOnly = true)
    public TripDTO getById(Long id) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        return toDTO(trip);
    }

    /**
     * Tìm kiếm Trip theo trạng thái (phân trang).
     * - Nếu status rỗng: trả tất cả.
     * - Nếu có: parse Trip.TripStatus và lọc.
     * 
     * @param status   chuỗi trạng thái
     * @param pageable thông tin phân trang
     */
    @Override
    @Transactional(readOnly = true)
    public Page<TripDTO> search(String status, String date, Pageable pageable) {
        Date start = null;
        Date end = null;

        if (StringUtils.hasText(date)) {
            try {
                // Parse date string (yyyy-MM-dd)
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
                Date parsedDate = sdf.parse(date);

                // Set start of day
                start = new Date(parsedDate.getTime());

                // Set end of day
                end = new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000 - 1);
            } catch (ParseException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Use yyyy-MM-dd");
            }
        }

        Trip.TripStatus parsedStatus = null;
        if (StringUtils.hasText(status)) {
            try {
                parsedStatus = Trip.TripStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status value");
            }
        }

        Page<Trip> result;
        if (parsedStatus != null && start != null) {
            result = tripRepository.findByStatusAndPickupTimeBetween(parsedStatus, start, end, pageable);
        } else if (parsedStatus != null) {
            result = tripRepository.findByStatus(parsedStatus, pageable);
        } else if (start != null) {
            result = tripRepository.findByPickupTimeBetween(start, end, pageable);
        } else {
            result = tripRepository.findAll(pageable);
        }

        return result.map(this::toDTO);
    }

    /**
     * Cập nhật Trip theo id.
     * - Cập nhật thông tin khách hàng, địa điểm, thời gian, giá vé.
     * - Có thể cập nhật vehicleId, driverId để phân công xe, tài xế.
     * - Nếu có status hợp lệ thì ghi đè.
     * 
     * @param id  id chuyến
     * @param req dữ liệu cập nhật
     */
    @Override
    public TripDTO update(Long id, TripRequest req) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        if (trip.getStatus() == Trip.TripStatus.DA_HUY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể chỉnh sửa chuyến đã hủy");
        }
        Customer customer = resolveCustomerForUpdate(trip, req);
        String customerName = StringUtils.hasText(req.getCustomerName())
                ? req.getCustomerName().trim()
                : (StringUtils.hasText(customer.getName()) ? customer.getName() : customer.getPhone());
        String customerPhone = StringUtils.hasText(customer.getPhone())
                ? customer.getPhone()
                : req.getCustomerPhone();
        if (!StringUtils.hasText(customerPhone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerPhone is required");
        }
        customerPhone = customerPhone.trim();
        if (StringUtils.hasText(customerName)) {
            customerName = customerName.trim();
        } else {
            customerName = customerPhone;
        }

        trip.setCustomerName(customerName);
        trip.setCustomerPhone(customerPhone);
        trip.setPickupLocation(req.getPickupLocation());
        trip.setPickupProvinceCode(req.getPickupProvinceCode());
        trip.setPickupWardCode(req.getPickupWardCode());
        trip.setDropoffLocation(req.getDropoffLocation());
        trip.setDropoffProvinceCode(req.getDropoffProvinceCode());
        trip.setDropoffWardCode(req.getDropoffWardCode());
        trip.setPickupTime(parseDate(req.getPickupTime()));
        trip.setDropoffTime(parseDate(req.getDropoffTime()));
        trip.setDistance(req.getDistance());
        trip.setPrice(req.getPrice());
        trip.setPassengers(req.getPassengers());
        trip.setNotes(req.getNotes());
        trip.setVehicleId(req.getVehicleId());
        trip.setVehicleName(req.getVehicleName());
        trip.setDriverId(req.getDriverId());
        trip.setDriverName(req.getDriverName());
        trip.setAssignedAt(parseDate(req.getAssignedAt()));
        trip.setStartedAt(parseDate(req.getStartedAt()));
        trip.setCompletedAt(parseDate(req.getCompletedAt()));
        if (req.getPickupConfirmed() != null) {
            trip.setPickupConfirmed(req.getPickupConfirmed());
        }
        if (req.getDropoffConfirmed() != null) {
            trip.setDropoffConfirmed(req.getDropoffConfirmed());
        }
        if (req.getGroupId() != null) {
            trip.setGroupId(req.getGroupId());
        }
        if (req.getFullVehicle() != null) {
            trip.setFullVehicle(req.getFullVehicle());
        }
        Trip.TripStatus previousStatus = trip.getStatus();
        if (req.getStatus() != null) {
            trip.setStatus(normalizeStatusForFullVehicle(trip, req.getStatus()));
        }
        trip = tripRepository.save(trip);
        if (previousStatus != trip.getStatus()) {
            recordStatusHistory(trip.getId(), previousStatus, trip.getStatus(), null);
        }
        trip = ensureTripGroupForFullVehicle(trip);
        autoRecordDriverCollection(trip, previousStatus);
        return toDTO(trip);
    }

    private Customer resolveCustomerForUpdate(Trip existingTrip, TripRequest req) {
        if (StringUtils.hasText(req.getCustomerPhone())) {
            return resolveCustomer(req);
        }
        return customerRepository.findFirstByPhoneOrderByIdAsc(existingTrip.getCustomerPhone())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Existing customer not found"));
    }

    private Customer resolveCustomer(TripRequest req) {
        if (!StringUtils.hasText(req.getCustomerPhone())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerPhone is required");
        }

        String phone = req.getCustomerPhone().trim();
        Customer customer = customerRepository.findFirstByPhoneOrderByIdAsc(phone)
                .orElseGet(() -> customerRepository.save(Customer.builder()
                        .name(StringUtils.hasText(req.getCustomerName()) ? req.getCustomerName().trim() : phone)
                        .phone(phone)
                        .address(req.getPickupLocation())
                        .status(Customer.CustomerStatus.HOAT_DONG)
                        .build()));

        boolean updated = false;
        if (!phone.equals(customer.getPhone())) {
            customer.setPhone(phone);
            updated = true;
        }
        if (StringUtils.hasText(req.getCustomerName())) {
            String name = req.getCustomerName().trim();
            if (!name.equals(customer.getName())) {
                customer.setName(name);
                updated = true;
            }
        }
        if (StringUtils.hasText(req.getPickupLocation())) {
            String address = req.getPickupLocation();
            if (customer.getAddress() == null || !customer.getAddress().equals(address)) {
                customer.setAddress(address);
                updated = true;
            }
        }
        if (updated && customer.getId() != null) {
            customer = customerRepository.save(customer);
        }
        return customer;
    }

    /**
     * Xóa Trip theo id (hard delete).
     * 
     * @param id id chuyến
     */
    @Override
    public void delete(Long id) {
        if (!tripRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found");
        }
        tripRepository.deleteById(id);
    }

    /**
     * Map entity Trip sang TripDTO với đầy đủ thông tin.
     */
    private TripDTO toDTO(Trip trip) {
        double reconciled = 0d;
        double pending = 0d;
        if (trip.getId() != null) {
            reconciled = safeSum(customerAdvancePaymentRepository
                    .sumAmountByTripIdAndStatus(trip.getId(), CustomerAdvancePayment.Status.RECONCILED));
            pending = safeSum(customerAdvancePaymentRepository
                    .sumAmountByTripIdAndStatuses(trip.getId(), Arrays.asList(
                            CustomerAdvancePayment.Status.PENDING,
                            CustomerAdvancePayment.Status.SUBMITTED)));
        }
        double price = trip.getPrice() != null ? trip.getPrice().doubleValue() : 0d;
        double outstanding = Math.max(price - reconciled, 0d);
        return TripDTO.builder()
                .id(trip.getId())
                .vehicleId(trip.getVehicleId())
                .vehicleName(trip.getVehicleName())
                .driverId(trip.getDriverId())
                .driverName(trip.getDriverName())
                .customerName(trip.getCustomerName())
                .customerPhone(trip.getCustomerPhone())
                .pickupLocation(trip.getPickupLocation())
                .pickupProvinceCode(trip.getPickupProvinceCode())
                .pickupWardCode(trip.getPickupWardCode())
                .dropoffLocation(trip.getDropoffLocation())
                .dropoffProvinceCode(trip.getDropoffProvinceCode())
                .dropoffWardCode(trip.getDropoffWardCode())
                .pickupTime(formatDate(trip.getPickupTime()))
                .dropoffTime(formatDate(trip.getDropoffTime()))
                .distance(trip.getDistance())
                .price(trip.getPrice())
                .status(trip.getStatus())
                .passengers(trip.getPassengers())
                .notes(trip.getNotes())
                .rating(trip.getRating())
                .createdAt(formatDate(trip.getCreatedAt()))
                .confirmedAt(formatDate(trip.getConfirmedAt()))
                .assignedAt(formatDate(trip.getAssignedAt()))
                .startedAt(formatDate(trip.getStartedAt()))
                .completedAt(formatDate(trip.getCompletedAt()))
                .pickupConfirmed(trip.getPickupConfirmed())
                .dropoffConfirmed(trip.getDropoffConfirmed())
                .groupId(trip.getGroupId())
                .fullVehicle(trip.getFullVehicle())
                .customerAdvanceReconciled(reconciled)
                .customerAdvancePending(pending)
                .customerOutstandingAmount(outstanding)
                .build();
    }

    private String formatDate(Date date) {
        if (date == null)
            return null;
        return dateFormat.format(date);
    }

    private double safeSum(Double value) {
        return value != null ? value : 0d;
    }

    private Trip.TripStatus normalizeStatusForFullVehicle(Trip trip, Trip.TripStatus requestedStatus) {
        if (requestedStatus == Trip.TripStatus.DA_XAC_NHAN && Boolean.TRUE.equals(trip.getFullVehicle())) {
            return Trip.TripStatus.DA_GHEP_CHUYEN;
        }
        return requestedStatus != null ? requestedStatus : trip.getStatus();
    }

    private Trip ensureTripGroupForFullVehicle(Trip trip) {
        if (trip == null || trip.getId() == null) {
            return trip;
        }
        boolean isFullVehicle = Boolean.TRUE.equals(trip.getFullVehicle());
        boolean isGroupedStatus = trip.getStatus() == Trip.TripStatus.DA_GHEP_CHUYEN;
        boolean alreadyGrouped = StringUtils.hasText(trip.getGroupId());
        if (!isFullVehicle || !isGroupedStatus || alreadyGrouped) {
            return trip;
        }

        TripGroup group = TripGroup.builder()
                .name(buildFullVehicleGroupName(trip))
                .tripIds(trip.getId().toString())
                .vehicleId(trip.getVehicleId())
                .vehicleName(trip.getVehicleName())
                .driverId(trip.getDriverId())
                .driverName(trip.getDriverName())
                .status(TripGroup.GroupStatus.DANG_GHEP)
                .pickupDate(trip.getPickupTime() != null ? 
                    trip.getPickupTime().toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate() : null)
                .totalPassengers(trip.getPassengers())
                .totalRevenue(trip.getPrice() != null ? trip.getPrice().doubleValue() : null)
                .build();
        group = tripGroupRepository.save(group);
        trip.setGroupId(group.getId().toString());
        return tripRepository.save(trip);
    }

    private String buildFullVehicleGroupName(Trip trip) {
        StringBuilder name = new StringBuilder("Bao xe");
        if (trip.getCustomerName() != null) {
            name.append(" - ").append(trip.getCustomerName());
        } else if (trip.getId() != null) {
            name.append(" #").append(trip.getId());
        }
        return name.toString();
    }

    private void autoRecordDriverCollection(Trip trip, Trip.TripStatus previousStatus) {
        if (trip == null) {
            return;
        }
        boolean justCompleted = trip.getStatus() == Trip.TripStatus.HOAN_THANH
                && previousStatus != Trip.TripStatus.HOAN_THANH;
        if (!justCompleted) {
            return;
        }
        if (trip.getDriverId() == null || trip.getPrice() == null || trip.getPrice().signum() <= 0) {
            return;
        }

        List<TripPayment> existing = tripPaymentRepository.findByTripId(trip.getId());
        if (!existing.isEmpty()) {
            return;
        }

        double totalAdvance = safeSum(customerAdvancePaymentRepository.sumAmountByTripIdAndStatuses(
                trip.getId(),
                Arrays.asList(
                        CustomerAdvancePayment.Status.PENDING,
                        CustomerAdvancePayment.Status.SUBMITTED,
                        CustomerAdvancePayment.Status.RECONCILED)));

        double netAmount = trip.getPrice().doubleValue() - totalAdvance;
        if (netAmount <= 0.0) {
            return;
        }

        TripPaymentRequest request = new TripPaymentRequest();
        request.setTripId(trip.getId());
        request.setDriverId(trip.getDriverId());
        request.setAmount(netAmount);
        request.setMethod(TripPayment.PaymentMethod.CASH);
        paymentService.createTripPayment(request, Collections.emptyList());
    }

    private void recordStatusHistory(Long tripId, Trip.TripStatus fromStatus, Trip.TripStatus toStatus, String note) {
        String actionBy = null;
        String actionByName = null;
        try {
            org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                actionBy = ud.getUsername();
                actionByName = ud.getUsername();
            }
        } catch (Exception ignored) {}
        TripStatusHistory history = TripStatusHistory.builder()
                .tripId(tripId)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .actionAt(new Date())
                .actionBy(actionBy)
                .actionByName(actionByName)
                .note(note)
                .build();
        tripStatusHistoryRepository.save(history);
    }

    @Override
    public List<TripStatusHistoryDTO> getStatusHistory(Long tripId) {
        return tripStatusHistoryRepository.findByTripIdOrderByActionAtDesc(tripId)
                .stream()
                .map(h -> TripStatusHistoryDTO.builder()
                        .id(h.getId())
                        .tripId(h.getTripId())
                        .fromStatus(h.getFromStatus())
                        .toStatus(h.getToStatus())
                        .actionAt(formatDate(h.getActionAt()))
                        .actionBy(h.getActionBy())
                        .actionByName(h.getActionByName())
                        .note(h.getNote())
                        .build())
                .toList();
    }
}
