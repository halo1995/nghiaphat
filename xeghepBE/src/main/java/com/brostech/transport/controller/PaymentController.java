package com.brostech.transport.controller;

import com.brostech.transport.dto.payment.AccountingSummaryDTO;
import com.brostech.transport.dto.payment.CustomerAdvancePaymentDTO;
import com.brostech.transport.dto.payment.CustomerAdvancePaymentRequest;
import com.brostech.transport.dto.payment.CustomerAdvanceStatusUpdateRequest;
import com.brostech.transport.dto.payment.DepositRecordDTO;
import com.brostech.transport.dto.payment.DepositRecordRequest;
import com.brostech.transport.dto.payment.DriverExpenseAdvanceDTO;
import com.brostech.transport.dto.payment.DriverExpenseAdvanceRequest;
import com.brostech.transport.dto.payment.DriverExpenseAdvanceStatusUpdateRequest;
import com.brostech.transport.dto.payment.TripPaymentDTO;
import com.brostech.transport.dto.payment.TripPaymentRequest;
import com.brostech.transport.jpa.entity.PaymentAttachment;
import com.brostech.transport.service.PaymentAttachmentService;
import com.brostech.transport.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;

/**
 * PaymentController
 * Mục đích: Cung cấp API quản lý thanh toán và đặt cọc trong hệ thống vận chuyển.
 * Các chức năng chính:
 * - Quản lý thanh toán chuyến đi: POST/GET/DELETE /payments/trips
 * - Quản lý đặt cọc: POST/GET/DELETE /payments/deposits
 * - Tra cứu lịch sử theo tài xế: GET /payments/trips?driverId=..., /payments/deposits?driverId=...
 * - Quản lý tiền ứng trước khách hàng: POST/PATCH/GET /payments/customer-advances
 * - Quản lý tạm ứng chi phí tài xế: POST/PATCH/GET /payments/driver-advances
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("transport-service/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentAttachmentService attachmentService;

    // Trip Payments

    /**
     * Tạo mới thanh toán cho chuyến đi.
     * @param req thông tin thanh toán
     * @return TripPaymentDTO đã tạo
     */
    @PostMapping(value = "/trips", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TripPaymentDTO createTripPaymentWithAttachments(@Valid @RequestPart("payload") TripPaymentRequest req,
                                                           @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return paymentService.createTripPayment(req, images == null ? Collections.emptyList() : images);
    }

    @PostMapping(value = "/trips", consumes = MediaType.APPLICATION_JSON_VALUE)
    public TripPaymentDTO createTripPayment(@Valid @RequestBody TripPaymentRequest req) {
        return paymentService.createTripPayment(req, Collections.emptyList());
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
    @PostMapping(value = "/deposits", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DepositRecordDTO createDepositRecordWithAttachments(@Valid @RequestPart("payload") DepositRecordRequest req,
                                                               @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return paymentService.createDepositRecord(req, images == null ? Collections.emptyList() : images);
    }

    @PostMapping(value = "/deposits", consumes = MediaType.APPLICATION_JSON_VALUE)
    public DepositRecordDTO createDepositRecord(@Valid @RequestBody DepositRecordRequest req) {
        return paymentService.createDepositRecord(req, Collections.emptyList());
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

    // Customer advance payments

    @PostMapping(value = "/customer-advances", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CustomerAdvancePaymentDTO createCustomerAdvanceWithAttachments(
            @Valid @RequestPart("payload") CustomerAdvancePaymentRequest req,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return paymentService.createCustomerAdvancePayment(req, images == null ? Collections.emptyList() : images);
    }

    @PostMapping(value = "/customer-advances", consumes = MediaType.APPLICATION_JSON_VALUE)
    public CustomerAdvancePaymentDTO createCustomerAdvance(@Valid @RequestBody CustomerAdvancePaymentRequest req) {
        return paymentService.createCustomerAdvancePayment(req, Collections.emptyList());
    }

    @PatchMapping("/customer-advances/{id}/status")
    public CustomerAdvancePaymentDTO updateCustomerAdvanceStatus(@PathVariable Long id,
                                                                 @Valid @RequestBody CustomerAdvanceStatusUpdateRequest req) {
        return paymentService.updateCustomerAdvanceStatus(id, req);
    }

    @GetMapping("/customer-advances")
    public Page<CustomerAdvancePaymentDTO> searchCustomerAdvances(@RequestParam(value = "status", required = false) String status,
                                                                  @RequestParam(value = "tripId", required = false) Long tripId,
                                                                  Pageable pageable) {
        return paymentService.searchCustomerAdvancePayments(status, tripId, pageable);
    }

    // Driver expense advances

    @PostMapping(value = "/driver-advances", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DriverExpenseAdvanceDTO createDriverAdvanceWithAttachments(
            @Valid @RequestPart("payload") DriverExpenseAdvanceRequest req,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return paymentService.createDriverExpenseAdvance(req, images == null ? Collections.emptyList() : images);
    }

    @PostMapping(value = "/driver-advances", consumes = MediaType.APPLICATION_JSON_VALUE)
    public DriverExpenseAdvanceDTO createDriverAdvance(@Valid @RequestBody DriverExpenseAdvanceRequest req) {
        return paymentService.createDriverExpenseAdvance(req, Collections.emptyList());
    }

    @PatchMapping("/driver-advances/{id}/status")
    public DriverExpenseAdvanceDTO updateDriverAdvanceStatus(@PathVariable Long id,
                                                             @Valid @RequestBody DriverExpenseAdvanceStatusUpdateRequest req) {
        return paymentService.updateDriverExpenseAdvanceStatus(id, req);
    }

    @GetMapping("/driver-advances")
    public Page<DriverExpenseAdvanceDTO> searchDriverAdvances(@RequestParam(value = "driverId", required = false) Long driverId,
                                                              @RequestParam(value = "status", required = false) String status,
                                                              @RequestParam(value = "from", required = false) String from,
                                                              @RequestParam(value = "to", required = false) String to,
                                                              Pageable pageable) {
        return paymentService.searchDriverExpenseAdvances(driverId, status, from, to, pageable);
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

    @GetMapping("/attachments/{id}")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long id) {
        PaymentAttachment attachment = attachmentService.getAttachmentOrThrow(id);
        Resource resource = attachmentService.loadAsResource(attachment);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (attachment.getContentType() != null) {
            try {
                mediaType = MediaType.parseMediaType(attachment.getContentType());
            } catch (Exception ignored) {
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }
        }

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok().contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + attachment.getFileName() + "\"");
        if (attachment.getSizeBytes() != null) {
            builder = builder.contentLength(attachment.getSizeBytes());
        }
        return builder.body(resource);
    }
}
