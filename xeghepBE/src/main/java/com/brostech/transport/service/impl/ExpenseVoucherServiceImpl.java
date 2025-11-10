package com.brostech.transport.service.impl;

import com.brostech.transport.dto.expense.ExpenseSummaryDTO;
import com.brostech.transport.dto.expense.ExpenseVoucherDTO;
import com.brostech.transport.dto.expense.ExpenseVoucherHistoryDTO;
import com.brostech.transport.dto.expense.ExpenseVoucherRequest;
import com.brostech.transport.dto.expense.ExpenseVoucherStatusUpdateRequest;
import com.brostech.transport.dto.payment.PaymentAttachmentDTO;
import com.brostech.transport.jpa.entity.*;
import com.brostech.transport.jpa.repository.*;
import com.brostech.transport.service.ExpenseVoucherService;
import com.brostech.transport.service.PaymentAttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ExpenseVoucherServiceImpl implements ExpenseVoucherService {

    private final ExpenseVoucherRepository voucherRepository;
    private final ExpenseVoucherHistoryRepository historyRepository;
    private final CompanyWalletRepository walletRepository;
    private final CompanyTransactionRepository transactionRepository;
    private final PaymentAttachmentService attachmentService;
    private final UserRepository userRepository;
    private final DriverExpenseAdvanceRepository driverExpenseAdvanceRepository;

    private final SimpleDateFormat dateTimeFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");

    @Override
    public ExpenseVoucherDTO create(ExpenseVoucherRequest request, List<MultipartFile> attachments) {
        User actor = getUserOrThrow(request.getActorId());
        requireAccountantPrivileges(actor);

        CompanyWallet wallet = resolveWallet(request.getWalletId());

        ExpenseVoucher voucher = ExpenseVoucher.builder()
                .code(generateCode())
                .title(request.getTitle())
                .category(request.getCategory())
                .amount(request.getAmount())
                .payeeName(request.getPayeeName())
                .payeeAccount(request.getPayeeAccount())
                .description(request.getDescription())
                .note(request.getNote())
                .status(ExpenseVoucher.Status.DRAFT)
                .walletId(wallet.getId())
                .driverExpenseAdvanceId(resolveDriverAdvanceId(request.getDriverExpenseAdvanceId()))
                .createdBy(actor.getId())
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        ExpenseVoucher saved = voucherRepository.save(voucher);
        recordHistory(saved.getId(), null, saved.getStatus(), actor.getId(), "Khởi tạo phiếu chi");

        if (request.isSubmitImmediately()) {
            saved = transitionToPending(saved, actor.getId(), request.getNote());
        }

        storeAttachments(saved.getId(), attachments);
        return toDTO(saved, Map.of(actor.getId(), actor));
    }

    @Override
    public ExpenseVoucherDTO update(Long id, ExpenseVoucherRequest request, List<MultipartFile> attachments) {
        ExpenseVoucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu chi"));

        if (voucher.getStatus() == ExpenseVoucher.Status.APPROVED || voucher.getStatus() == ExpenseVoucher.Status.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể chỉnh sửa phiếu chi đã hoàn tất");
        }

        User actor = getUserOrThrow(request.getActorId());
        requireAccountantPrivileges(actor);

        CompanyWallet wallet = resolveWallet(Optional.ofNullable(request.getWalletId()).orElse(voucher.getWalletId()));

        voucher.setTitle(request.getTitle());
        voucher.setCategory(request.getCategory());
        voucher.setAmount(request.getAmount());
        voucher.setPayeeName(request.getPayeeName());
        voucher.setPayeeAccount(request.getPayeeAccount());
        voucher.setDescription(request.getDescription());
        voucher.setNote(request.getNote());
        voucher.setWalletId(wallet.getId());
        voucher.setDriverExpenseAdvanceId(resolveDriverAdvanceId(request.getDriverExpenseAdvanceId()));
        voucher.setUpdatedAt(new Date());

        ExpenseVoucher updated = voucherRepository.save(voucher);

        if (request.isSubmitImmediately() && updated.getStatus() == ExpenseVoucher.Status.DRAFT) {
            updated = transitionToPending(updated, actor.getId(), request.getNote());
        }

        storeAttachments(updated.getId(), attachments);

        Map<Long, User> userCache = preloadUsers(updated);
        userCache.put(actor.getId(), actor);
        return toDTO(updated, userCache);
    }

    @Override
    public ExpenseVoucherDTO updateStatus(Long id, ExpenseVoucherStatusUpdateRequest request) {
        ExpenseVoucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu chi"));

        ExpenseVoucher.Status targetStatus = request.getStatus();
        ExpenseVoucher.Status currentStatus = voucher.getStatus();

        if (currentStatus == targetStatus) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phiếu chi đã ở trạng thái yêu cầu");
        }

        User actor = getUserOrThrow(request.getActionUserId());

        switch (targetStatus) {
            case PENDING -> {
                requireAccountantPrivileges(actor);
                if (currentStatus != ExpenseVoucher.Status.DRAFT) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ phiếu nháp mới được gửi duyệt");
                }
                voucher = transitionToPending(voucher, actor.getId(), request.getNote());
            }
            case APPROVED -> {
                requireAdminPrivileges(actor);
                if (currentStatus != ExpenseVoucher.Status.PENDING) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ phiếu đang chờ duyệt mới được duyệt");
                }
                voucher = approveVoucher(voucher, actor.getId(), request.getNote());
            }
            case REJECTED -> {
                requireAdminPrivileges(actor);
                if (currentStatus != ExpenseVoucher.Status.PENDING) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ phiếu đang chờ duyệt mới được từ chối");
                }
                voucher = rejectVoucher(voucher, actor.getId(), request.getRejectionReason());
            }
            case DRAFT -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể chuyển về trạng thái nháp");
        }

        Map<Long, User> userCache = preloadUsers(voucher);
        userCache.put(actor.getId(), actor);
        return toDTO(voucher, userCache);
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseVoucherDTO getById(Long id) {
        ExpenseVoucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu chi"));
        return toDTO(voucher, preloadUsers(voucher));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ExpenseVoucherDTO> search(String status,
                                          String category,
                                          String from,
                                          String to,
                                          Long createdBy,
                                          Long walletId,
                                          Pageable pageable) {
        Specification<ExpenseVoucher> spec = Specification.where(null);

        if (status != null && !status.isBlank()) {
            ExpenseVoucher.Status parsedStatus = parseStatus(status);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), parsedStatus));
        }

        if (category != null && !category.isBlank()) {
            ExpenseVoucher.Category parsedCategory = parseCategory(category);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), parsedCategory));
        }

        Date fromDate = parseDate(from, true);
        if (fromDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate));
        }

        Date toDate = parseDate(to, false);
        if (toDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), toDate));
        }

        if (createdBy != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("createdBy"), createdBy));
        }

        if (walletId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("walletId"), walletId));
        }

        Page<ExpenseVoucher> page = voucherRepository.findAll(spec, pageable);
        Map<Long, User> userCache = preloadUsers(page.getContent());
        return page.map(voucher -> toDTO(voucher, userCache));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseVoucherHistoryDTO> getHistory(Long voucherId) {
        ExpenseVoucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu chi"));

        List<ExpenseVoucherHistory> history = historyRepository.findByVoucherIdOrderByActionAtDesc(voucher.getId());
        Map<Long, User> userCache = preloadUsers(history.stream()
                .map(ExpenseVoucherHistory::getActionBy)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList()));

        return history.stream()
                .map(entry -> ExpenseVoucherHistoryDTO.builder()
                        .id(entry.getId())
                        .fromStatus(entry.getFromStatus() != null ? entry.getFromStatus().name() : null)
                        .toStatus(entry.getToStatus().name())
                        .note(entry.getNote())
                        .actionBy(entry.getActionBy())
                        .actionByName(resolveUserName(entry.getActionBy(), userCache))
                        .actionAt(formatDate(entry.getActionAt()))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseSummaryDTO getSummary(String from, String to) {
        Specification<ExpenseVoucher> spec = Specification.where(null);
        Date fromDate = parseDate(from, true);
        Date toDate = parseDate(to, false);
        if (fromDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate));
        }
        if (toDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), toDate));
        }

        List<ExpenseVoucher> vouchers = voucherRepository.findAll(spec);

        double totalPending = sumAmountByStatus(vouchers, ExpenseVoucher.Status.PENDING);
        double totalApproved = sumAmountByStatus(vouchers, ExpenseVoucher.Status.APPROVED);
        double totalRejected = sumAmountByStatus(vouchers, ExpenseVoucher.Status.REJECTED);

        long pendingCount = countByStatus(vouchers, ExpenseVoucher.Status.PENDING);
        long approvedCount = countByStatus(vouchers, ExpenseVoucher.Status.APPROVED);
        long rejectedCount = countByStatus(vouchers, ExpenseVoucher.Status.REJECTED);

        double walletBalance = walletRepository.findAll().stream()
                .map(CompanyWallet::getBalance)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        return ExpenseSummaryDTO.builder()
                .totalApproved(totalApproved)
                .totalPending(totalPending)
                .totalRejected(totalRejected)
                .approvedCount(approvedCount)
                .pendingCount(pendingCount)
                .rejectedCount(rejectedCount)
                .walletBalance(walletBalance)
                .build();
    }

    private ExpenseVoucher.Status parseStatus(String value) {
        try {
            return ExpenseVoucher.Status.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái phiếu chi không hợp lệ");
        }
    }

    private ExpenseVoucher.Category parseCategory(String value) {
        try {
            return ExpenseVoucher.Category.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh mục phiếu chi không hợp lệ");
        }
    }

    private Date parseDate(String value, boolean startOfDay) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        try {
            if (trimmed.length() == 10) {
                return dateTimeFormat.parse(trimmed + (startOfDay ? " 00:00:00" : " 23:59:59"));
            }
            return dateTimeFormat.parse(trimmed);
        } catch (ParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Định dạng thời gian không hợp lệ. Dùng yyyy-MM-dd hoặc yyyy-MM-dd HH:mm:ss");
        }
    }

    private ExpenseVoucher transitionToPending(ExpenseVoucher voucher, Long actorId, String note) {
        voucher.setStatus(ExpenseVoucher.Status.PENDING);
        voucher.setSubmittedBy(actorId);
        voucher.setSubmittedAt(new Date());
        voucher.setUpdatedAt(new Date());
        ExpenseVoucher saved = voucherRepository.save(voucher);
        recordHistory(saved.getId(), ExpenseVoucher.Status.DRAFT, ExpenseVoucher.Status.PENDING, actorId,
                note != null ? note : "Gửi duyệt phiếu chi");
        return saved;
    }

    private ExpenseVoucher approveVoucher(ExpenseVoucher voucher, Long actorId, String note) {
        voucher.setStatus(ExpenseVoucher.Status.APPROVED);
        voucher.setApprovedBy(actorId);
        voucher.setApprovedAt(new Date());
        voucher.setUpdatedAt(new Date());

        applyApprovalImpact(voucher, actorId, note);
        ExpenseVoucher saved = voucherRepository.save(voucher);
        recordHistory(saved.getId(), ExpenseVoucher.Status.PENDING, ExpenseVoucher.Status.APPROVED, actorId,
                note != null ? note : "Duyệt chi");
        return saved;
    }

    private ExpenseVoucher rejectVoucher(ExpenseVoucher voucher, Long actorId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần nhập lý do từ chối");
        }
        voucher.setStatus(ExpenseVoucher.Status.REJECTED);
        voucher.setRejectedBy(actorId);
        voucher.setRejectedAt(new Date());
        voucher.setRejectionReason(reason);
        voucher.setUpdatedAt(new Date());

        ExpenseVoucher saved = voucherRepository.save(voucher);
        recordHistory(saved.getId(), ExpenseVoucher.Status.PENDING, ExpenseVoucher.Status.REJECTED, actorId, reason);
        return saved;
    }

    private void applyApprovalImpact(ExpenseVoucher voucher, Long actorId, String note) {
        CompanyWallet wallet = walletRepository.findById(voucher.getWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy ví công ty"));

        double currentBalance = Objects.requireNonNullElse(wallet.getBalance(), 0.0);
        double newBalance = currentBalance - voucher.getAmount();
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        CompanyTransaction transaction = CompanyTransaction.builder()
                .walletId(wallet.getId())
                .amount(voucher.getAmount())
                .transactionType(CompanyTransaction.TransactionType.EXPENSE)
                .referenceType(PaymentAttachment.ReferenceType.EXPENSE_VOUCHER.name())
                .referenceId(voucher.getId())
                .description(note != null ? note : "Chi phiếu " + voucher.getTitle())
                .createdBy(actorId)
                .balanceAfter(newBalance)
                .build();
        transactionRepository.save(transaction);
    }

    private void recordHistory(Long voucherId,
                               ExpenseVoucher.Status from,
                               ExpenseVoucher.Status to,
                               Long actionBy,
                               String note) {
        ExpenseVoucherHistory history = ExpenseVoucherHistory.builder()
                .voucherId(voucherId)
                .fromStatus(from)
                .toStatus(to)
                .actionBy(actionBy)
                .note(note)
                .build();
        historyRepository.save(history);
    }

    private void storeAttachments(Long voucherId, List<MultipartFile> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return;
        }
        attachmentService.storeAttachments(PaymentAttachment.ReferenceType.EXPENSE_VOUCHER, voucherId, attachments);
    }

    private Long resolveDriverAdvanceId(Long driverAdvanceId) {
        if (driverAdvanceId == null) {
            return null;
        }
        if (!driverExpenseAdvanceRepository.existsById(driverAdvanceId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoản tạm ứng tài xế không tồn tại");
        }
        return driverAdvanceId;
    }

    private CompanyWallet resolveWallet(Long walletId) {
        if (walletId != null) {
            return walletRepository.findById(walletId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ví công ty không tồn tại"));
        }
        return walletRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa cấu hình ví công ty"));
    }

    private User getUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người dùng không tồn tại"));
    }

    private void requireAccountantPrivileges(User user) {
        if (user.getRole() != User.UserRole.ACCOUNTANT && user.getRole() != User.UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ kế toán hoặc admin mới được thao tác");
        }
    }

    private void requireAdminPrivileges(User user) {
        if (user.getRole() != User.UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được duyệt phiếu chi");
        }
    }

    private String generateCode() {
        String prefix = "EXP";
        String datePart = dateFormat.format(new Date()).replaceAll("-", "");
        String randomPart = UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
        return prefix + "-" + datePart + "-" + randomPart;
    }

    private ExpenseVoucherDTO toDTO(ExpenseVoucher voucher, Map<Long, User> userCache) {
        List<PaymentAttachmentDTO> attachments = attachmentService.getAttachments(PaymentAttachment.ReferenceType.EXPENSE_VOUCHER, voucher.getId()).stream()
                .map(attachment -> PaymentAttachmentDTO.builder()
                        .id(attachment.getId())
                        .fileName(attachment.getFileName())
                        .contentType(attachment.getContentType())
                        .sizeBytes(attachment.getSizeBytes())
                        .createdAt(formatDate(attachment.getCreatedAt()))
                        .expiresAt(formatDate(attachment.getExpiresAt()))
                        .downloadUrl(buildAttachmentDownloadUrl(attachment.getId()))
                        .build())
                .collect(Collectors.toList());

        return ExpenseVoucherDTO.builder()
                .id(voucher.getId())
                .code(voucher.getCode())
                .title(voucher.getTitle())
                .category(voucher.getCategory().name())
                .amount(voucher.getAmount())
                .payeeName(voucher.getPayeeName())
                .payeeAccount(voucher.getPayeeAccount())
                .description(voucher.getDescription())
                .note(voucher.getNote())
                .status(voucher.getStatus().name())
                .walletId(voucher.getWalletId())
                .walletName(resolveWalletName(voucher.getWalletId()))
                .driverExpenseAdvanceId(voucher.getDriverExpenseAdvanceId())
                .createdBy(voucher.getCreatedBy())
                .createdByName(resolveUserName(voucher.getCreatedBy(), userCache))
                .createdAt(formatDate(voucher.getCreatedAt()))
                .submittedBy(voucher.getSubmittedBy())
                .submittedByName(resolveUserName(voucher.getSubmittedBy(), userCache))
                .submittedAt(formatDate(voucher.getSubmittedAt()))
                .approvedBy(voucher.getApprovedBy())
                .approvedByName(resolveUserName(voucher.getApprovedBy(), userCache))
                .approvedAt(formatDate(voucher.getApprovedAt()))
                .rejectedBy(voucher.getRejectedBy())
                .rejectedByName(resolveUserName(voucher.getRejectedBy(), userCache))
                .rejectedAt(formatDate(voucher.getRejectedAt()))
                .rejectionReason(voucher.getRejectionReason())
                .attachments(attachments)
                .build();
    }

    private Map<Long, User> preloadUsers(ExpenseVoucher voucher) {
        return preloadUsers(List.of(voucher));
    }

    private Map<Long, User> preloadUsers(List<ExpenseVoucher> vouchers) {
        Set<Long> userIds = new HashSet<>();
        for (ExpenseVoucher voucher : vouchers) {
            addIfNotNull(userIds, voucher.getCreatedBy());
            addIfNotNull(userIds, voucher.getSubmittedBy());
            addIfNotNull(userIds, voucher.getApprovedBy());
            addIfNotNull(userIds, voucher.getRejectedBy());
        }
        return preloadUsers(userIds);
    }

    private Map<Long, User> preloadUsers(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return new HashMap<>();
        }
        List<User> users = userRepository.findAllById(userIds);
        return users.stream().collect(Collectors.toMap(User::getId, user -> user));
    }

    private void addIfNotNull(Set<Long> target, Long value) {
        if (value != null) {
            target.add(value);
        }
    }

    private String resolveUserName(Long userId, Map<Long, User> cache) {
        if (userId == null) {
            return null;
        }
        if (cache != null && cache.containsKey(userId)) {
            return cache.get(userId).getName();
        }
        return userRepository.findById(userId)
                .map(User::getName)
                .orElse(null);
    }

    private String resolveWalletName(Long walletId) {
        if (walletId == null) {
            return null;
        }
        return walletRepository.findById(walletId)
                .map(CompanyWallet::getName)
                .orElse(null);
    }

    private double sumAmountByStatus(List<ExpenseVoucher> vouchers, ExpenseVoucher.Status status) {
        return vouchers.stream()
                .filter(voucher -> voucher.getStatus() == status)
                .map(ExpenseVoucher::getAmount)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
    }

    private long countByStatus(List<ExpenseVoucher> vouchers, ExpenseVoucher.Status status) {
        return vouchers.stream().filter(voucher -> voucher.getStatus() == status).count();
    }

    private String buildAttachmentDownloadUrl(Long attachmentId) {
        try {
            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/transport-service/payments/attachments/")
                    .path(attachmentId.toString())
                    .toUriString();
        } catch (IllegalStateException ex) {
            return "/transport-service/payments/attachments/" + attachmentId;
        }
    }

    private String formatDate(Date date) {
        if (date == null) {
            return null;
        }
        return dateTimeFormat.format(date);
    }
}
