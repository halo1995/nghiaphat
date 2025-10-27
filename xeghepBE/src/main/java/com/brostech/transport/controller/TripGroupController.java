package com.brostech.transport.controller;

import com.brostech.transport.dto.trip.TripGroupDTO;
import com.brostech.transport.dto.trip.TripGroupRequest;
import com.brostech.transport.service.TripGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

/**
 * TripGroupController
 * Mục đích: Cung cấp API quản lý nhóm ghép chuyến.
 * Các chức năng chính:
 * - CRUD cơ bản cho trip groups
 * - Phân công xe: POST /trip-groups/{id}/assign-vehicle
 * - Phân công tài xế: POST /trip-groups/{id}/assign-driver
 * - Thêm chuyến vào nhóm: POST /trip-groups/{id}/add-trip
 * - Xóa chuyến khỏi nhóm: DELETE /trip-groups/{id}/remove-trip
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/trip-groups")
public class TripGroupController {

    private final TripGroupService tripGroupService;

    /**
     * Tạo mới nhóm ghép chuyến.
     * @param req thông tin nhóm chuyến
     * @return TripGroupDTO đã tạo
     */
    @PostMapping
    public TripGroupDTO create(@Valid @RequestBody TripGroupRequest req) {
        return tripGroupService.create(req);
    }

    /**
     * Lấy chi tiết nhóm chuyến theo ID.
     * @param id ID của nhóm chuyến
     * @return thông tin chi tiết nhóm chuyến
     */
    @GetMapping("/{id}")
    public TripGroupDTO get(@PathVariable Long id) {
        return tripGroupService.getById(id);
    }

    /**
     * Tìm kiếm nhóm chuyến theo trạng thái (phân trang).
     * @param status trạng thái nhóm chuyến (tùy chọn)
     * @param pageable thông tin phân trang
     * @return danh sách nhóm chuyến
     */
    @GetMapping
    public Page<TripGroupDTO> search(@RequestParam(value = "status", required = false) String status,
                                     Pageable pageable) {
        return tripGroupService.search(status, pageable);
    }

    /**
     * Cập nhật thông tin nhóm chuyến.
     * @param id ID nhóm chuyến
     * @param req thông tin cập nhật
     * @return TripGroupDTO đã cập nhật
     */
    @PutMapping("/{id}")
    public TripGroupDTO update(@PathVariable Long id, @Valid @RequestBody TripGroupRequest req) {
        return tripGroupService.update(id, req);
    }

    /**
     * Xóa nhóm chuyến.
     * @param id ID nhóm chuyến cần xóa
     */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        tripGroupService.delete(id);
    }

    /**
     * Phân công xe cho nhóm chuyến.
     * @param id ID nhóm chuyến
     * @param vehicleId ID xe muốn phân công
     * @return TripGroupDTO đã cập nhật
     */
    @PostMapping("/{id}/assign-vehicle")
    public TripGroupDTO assignVehicle(@PathVariable Long id, @RequestParam Long vehicleId) {
        return tripGroupService.assignVehicle(id, vehicleId);
    }

    /**
     * Phân công tài xế cho nhóm chuyến.
     * @param id ID nhóm chuyến
     * @param driverId ID tài xế muốn phân công
     * @return TripGroupDTO đã cập nhật
     */
    @PostMapping("/{id}/assign-driver")
    public TripGroupDTO assignDriver(@PathVariable Long id, @RequestParam Long driverId) {
        return tripGroupService.assignDriver(id, driverId);
    }

    /**
     * Thêm chuyến vào nhóm ghép.
     * @param id ID nhóm chuyến
     * @param tripId ID chuyến muốn thêm
     * @return TripGroupDTO đã cập nhật
     */
    @PostMapping("/{id}/add-trip")
    public TripGroupDTO addTrip(@PathVariable Long id, @RequestParam Long tripId) {
        return tripGroupService.addTrip(id, tripId);
    }

    /**
     * Xóa chuyến khỏi nhóm ghép.
     * @param id ID nhóm chuyến
     * @param tripId ID chuyến muốn xóa
     * @return TripGroupDTO đã cập nhật
     */
    @DeleteMapping("/{id}/remove-trip")
    public TripGroupDTO removeTrip(@PathVariable Long id, @RequestParam Long tripId) {
        return tripGroupService.removeTrip(id, tripId);
    }
}
