package com.brostech.transport.controller;

import com.brostech.transport.dto.payment.AccountingSummaryDTO;
import com.brostech.transport.dto.payment.DepositRecordDTO;
import com.brostech.transport.dto.payment.DepositRecordRequest;
import com.brostech.transport.dto.payment.TripPaymentDTO;
import com.brostech.transport.dto.payment.TripPaymentRequest;
import com.brostech.transport.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

/**
 * PaymentController
 * Mục đích: Cung cấp API quản lý thanh toán và đặt cọc trong hệ thống vận chuyển.
 * Các chức năng chính:
 * - Quản lý thanh toán chuyến đi: POST/GET/DELETE /payments/trips
 * - Quản lý đặt cọc: POST/GET/DELETE /payments/deposits
 * - Tra cứu lịch sử theo tài xế: GET /payments/trips?driverId=..., /payments/deposits?driverId=...
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("transport-service/payments")
public class PaymentController {

    private final PaymentService paymentService;

    // Trip Payments

    /**
     * Tạo mới thanh toán cho chuyến đi.
     * @param req thông tin thanh toán
     * @return TripPaymentDTO đã tạo
     */
    @PostMapping("/trips")
    public TripPaymentDTO createTripPayment(@Valid @RequestBody TripPaymentRequest req) {
        return paymentService.createTripPayment(req);
    }

    /**
     * Lấy chi tiết thanh toán chuyến đi theo ID.
     * @param id ID thanh toán
     * @return thông tin chi tiết thanh toán
     */
    @GetMapping("/trips/{id}")
    public TripPaymentDTO getTripPayment(@PathVariable Long id) {
        return paymentService.getTripPaymentById(id);
    }

    /**
     * Tìm kiếm lịch sử thanh toán chuyến đi theo tài xế (phân trang).
     * @param driverId ID tài xế (tùy chọn)
     * @param pageable thông tin phân trang
     * @return danh sách thanh toán chuyến đi
     */
    @GetMapping("/trips")
    public Page<TripPaymentDTO> searchTripPayments(@RequestParam(value = "driverId", required = false) Long driverId,
                                                   Pageable pageable) {
        return paymentService.searchTripPayments(driverId, pageable);
    }

    /**
     * Xóa thanh toán chuyến đi.
     * @param id ID thanh toán cần xóa
     */
    @DeleteMapping("/trips/{id}")
    public void deleteTripPayment(@PathVariable Long id) {
        paymentService.deleteTripPayment(id);
    }

    // Deposit Records

    /**
     * Tạo mới ghi nhận đặt cọc.
     * @param req thông tin đặt cọc
     * @return DepositRecordDTO đã tạo
     */
    @PostMapping("/deposits")
    public DepositRecordDTO createDepositRecord(@Valid @RequestBody DepositRecordRequest req) {
        return paymentService.createDepositRecord(req);
    }

    /**
     * Lấy chi tiết ghi nhận đặt cọc theo ID.
     * @param id ID ghi nhận
     * @return thông tin chi tiết ghi nhận đặt cọc
     */
    @GetMapping("/deposits/{id}")
    public DepositRecordDTO getDepositRecord(@PathVariable Long id) {
        return paymentService.getDepositRecordById(id);
    }

    /**
     * Tìm kiếm lịch sử đặt cọc theo tài xế (phân trang).
     * @param driverId ID tài xế (tùy chọn)
     * @param pageable thông tin phân trang
     * @return danh sách ghi nhận đặt cọc
     */
    @GetMapping("/deposits")
    public Page<DepositRecordDTO> searchDepositRecords(@RequestParam(value = "driverId", required = false) Long driverId,
                                                       Pageable pageable) {
        return paymentService.searchDepositRecords(driverId, pageable);
    }

    /**
     * Xóa ghi nhận đặt cọc.
     * @param id ID ghi nhận cần xóa
     */
    @DeleteMapping("/deposits/{id}")
    public void deleteDepositRecord(@PathVariable Long id) {
        paymentService.deleteDepositRecord(id);
    }

    /**
     * Tổng hợp doanh thu và công nợ theo tài xế.
     * @param from ngày bắt đầu (yyyy-MM-dd hoặc yyyy-MM-dd HH:mm:ss)
     * @param to ngày kết thúc (yyyy-MM-dd hoặc yyyy-MM-dd HH:mm:ss)
     * @return tổng hợp cho kế toán
     */
    @GetMapping("/summary")
    public AccountingSummaryDTO getAccountingSummary(@RequestParam(value = "from", required = false) String from,
                                                     @RequestParam(value = "to", required = false) String to) {
        return paymentService.getAccountingSummary(from, to);
    }
}
