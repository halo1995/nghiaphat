package com.brostech.transport.service.impl;

import com.brostech.transport.jpa.entity.*;
import com.brostech.transport.jpa.repository.*;
import com.brostech.transport.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final CompanyTransactionRepository transactionRepository;
    private final ExpenseVoucherRepository voucherRepository;
    private final CustomerAdvancePaymentRepository customerAdvancePaymentRepository;
    private final DriverExpenseAdvanceRepository driverExpenseAdvanceRepository;
    private final CompanyWalletRepository walletRepository;
    private final UserRepository userRepository;
    private final TripPaymentRepository tripPaymentRepository;
    private final DepositRecordRepository depositRecordRepository;
    private final TripRepository tripRepository;

    private final SimpleDateFormat dateTimeFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    private final SimpleDateFormat displayDateFormat = new SimpleDateFormat("dd/MM/yyyy");

    @Override
    public Resource generateAccountingReport(String from, String to) {
        try {
            Date fromDate = parseDate(from, true);
            Date toDate = parseDate(to, false);
            
            if (fromDate == null || toDate == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần cung cấp khoảng thời gian (from và to)");
            }

            // Query data
            List<CompanyTransaction> allTransactions = transactionRepository.findByCreatedAtBetween(fromDate, toDate);
            List<ExpenseVoucher> expenseVouchers = voucherRepository.findByCreatedAtBetweenAndStatusIn(
                    fromDate, toDate, Arrays.asList(ExpenseVoucher.Status.APPROVED, ExpenseVoucher.Status.PAID));
            List<CustomerAdvancePayment> customerPayments = customerAdvancePaymentRepository.findByCollectedAtBetween(fromDate, toDate);
            List<DriverExpenseAdvance> driverAdvances = driverExpenseAdvanceRepository.findByRequestedAtBetween(fromDate, toDate);

            // Filter data
            List<CompanyTransaction> incomeTransactions = allTransactions.stream()
                    .filter(t -> t.getTransactionType() == CompanyTransaction.TransactionType.INCOME)
                    .collect(Collectors.toList());
            List<CompanyTransaction> expenseTransactions = allTransactions.stream()
                    .filter(t -> t.getTransactionType() == CompanyTransaction.TransactionType.EXPENSE)
                    .collect(Collectors.toList());

            List<CustomerAdvancePayment> customerDebts = customerPayments.stream()
                    .filter(p -> p.getStatus() == CustomerAdvancePayment.Status.PENDING 
                            || p.getStatus() == CustomerAdvancePayment.Status.SUBMITTED)
                    .collect(Collectors.toList());

            List<DriverExpenseAdvance> driverDebts = driverAdvances.stream()
                    .filter(d -> d.getStatus() == DriverExpenseAdvance.Status.REQUESTED
                            || d.getStatus() == DriverExpenseAdvance.Status.APPROVED
                            || d.getStatus() == DriverExpenseAdvance.Status.TRANSFERRED)
                    .collect(Collectors.toList());

            // Calculate totals
            double totalIncome = incomeTransactions.stream().mapToDouble(CompanyTransaction::getAmount).sum()
                    + customerPayments.stream()
                    .filter(p -> p.getStatus() == CustomerAdvancePayment.Status.SUBMITTED 
                            || p.getStatus() == CustomerAdvancePayment.Status.RECONCILED)
                    .mapToDouble(CustomerAdvancePayment::getAmount).sum();

            double totalExpense = expenseTransactions.stream().mapToDouble(CompanyTransaction::getAmount).sum()
                    + expenseVouchers.stream().mapToDouble(ExpenseVoucher::getAmount).sum()
                    + driverAdvances.stream()
                    .filter(d -> d.getStatus() == DriverExpenseAdvance.Status.TRANSFERRED)
                    .mapToDouble(DriverExpenseAdvance::getAmount).sum();

            double customerDebtTotal = customerDebts.stream().mapToDouble(CustomerAdvancePayment::getAmount).sum();
            double driverDebtTotal = driverDebts.stream().mapToDouble(DriverExpenseAdvance::getAmount).sum();

            // Get wallet balance
            double currentBalance = walletRepository.findAll().stream()
                    .mapToDouble(w -> Objects.requireNonNullElse(w.getBalance(), 0.0))
                    .sum();

            // Create workbook
            Workbook workbook = new XSSFWorkbook();
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            // Sheet 1: Tổng quan
            createSummarySheet(workbook, headerStyle, currencyStyle, dateStyle, 
                    fromDate, toDate, totalIncome, totalExpense, currentBalance, 
                    customerDebtTotal, driverDebtTotal);

            // Sheet 2: Chi tiết thu
            createIncomeDetailSheet(workbook, headerStyle, currencyStyle, dateStyle, 
                    incomeTransactions, customerPayments);

            // Sheet 3: Chi tiết chi
            createExpenseDetailSheet(workbook, headerStyle, currencyStyle, dateStyle, 
                    expenseTransactions, expenseVouchers, driverAdvances);

            // Sheet 4: Công nợ khách hàng
            createCustomerDebtSheet(workbook, headerStyle, currencyStyle, dateStyle, customerDebts);

            // Sheet 5: Công nợ tài xế
            createDriverDebtSheet(workbook, headerStyle, currencyStyle, dateStyle, driverDebts);

            // Sheet 6: Lịch sử thu tiền (TripPayment)
            List<TripPayment> tripPayments = tripPaymentRepository.findByCollectedAtBetween(fromDate, toDate);
            createPaymentHistorySheet(workbook, headerStyle, currencyStyle, dateStyle, tripPayments);

            // Sheet 7: Lịch sử nộp tiền (DepositRecord)
            List<DepositRecord> depositRecords = depositRecordRepository.findByCreatedAtBetween(fromDate, toDate);
            createDepositHistorySheet(workbook, headerStyle, currencyStyle, dateStyle, depositRecords);

            // Sheet 8: Tổng hợp chuyến đi
            createTripSummarySheet(workbook, headerStyle, currencyStyle, dateStyle, fromDate, toDate);

            // Write to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            workbook.close();

            return new ByteArrayResource(outputStream.toByteArray());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, 
                    "Lỗi khi tạo báo cáo: " + e.getMessage());
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                    "Định dạng thời gian không hợp lệ. Dùng yyyy-MM-dd hoặc yyyy-MM-dd HH:mm:ss");
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0"));
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("dd/mm/yyyy"));
        return style;
    }

    private void createSummarySheet(Workbook workbook, CellStyle headerStyle, CellStyle currencyStyle, 
                                   CellStyle dateStyle, Date fromDate, Date toDate, 
                                   double totalIncome, double totalExpense, double currentBalance,
                                   double customerDebt, double driverDebt) {
        Sheet sheet = workbook.createSheet("Tổng quan");
        
        int rowNum = 0;
        Row row = sheet.createRow(rowNum++);
        Cell cell = row.createCell(0);
        cell.setCellValue("BÁO CÁO THU CHI CÔNG NỢ");
        cell.setCellStyle(headerStyle);
        
        row = sheet.createRow(rowNum++);
        row.createCell(0).setCellValue("Từ ngày:");
        row.createCell(1).setCellValue(fromDate != null ? displayDateFormat.format(fromDate) : "");
        
        row = sheet.createRow(rowNum++);
        row.createCell(0).setCellValue("Đến ngày:");
        row.createCell(1).setCellValue(toDate != null ? displayDateFormat.format(toDate) : "");
        
        row = sheet.createRow(rowNum++);
        row.createCell(0).setCellValue("Ngày xuất:");
        row.createCell(1).setCellValue(displayDateFormat.format(new Date()));
        
        rowNum++;
        row = sheet.createRow(rowNum++);
        row.createCell(0).setCellValue("Tổng thu trong kỳ:");
        cell = row.createCell(1);
        cell.setCellValue(totalIncome);
        cell.setCellStyle(currencyStyle);
        
        row = sheet.createRow(rowNum++);
        row.createCell(0).setCellValue("Tổng chi trong kỳ:");
        cell = row.createCell(1);
        cell.setCellValue(totalExpense);
        cell.setCellStyle(currencyStyle);
        
        row = sheet.createRow(rowNum++);
        row.createCell(0).setCellValue("Số dư cuối kỳ:");
        cell = row.createCell(1);
        cell.setCellValue(currentBalance);
        cell.setCellStyle(currencyStyle);
        
        rowNum++;
        row = sheet.createRow(rowNum++);
        row.createCell(0).setCellValue("Công nợ khách hàng:");
        cell = row.createCell(1);
        cell.setCellValue(customerDebt);
        cell.setCellStyle(currencyStyle);
        
        row = sheet.createRow(rowNum++);
        row.createCell(0).setCellValue("Công nợ tài xế:");
        cell = row.createCell(1);
        cell.setCellValue(driverDebt);
        cell.setCellStyle(currencyStyle);
        
        // Auto-size columns
        sheet.autoSizeColumn(0);
        sheet.autoSizeColumn(1);
    }

    private void createIncomeDetailSheet(Workbook workbook, CellStyle headerStyle, 
                                        CellStyle currencyStyle, CellStyle dateStyle,
                                        List<CompanyTransaction> incomeTransactions,
                                        List<CustomerAdvancePayment> customerPayments) {
        Sheet sheet = workbook.createSheet("Chi tiết thu");
        
        // Header
        Row headerRow = sheet.createRow(0);
        String[] headers = {"STT", "Ngày", "Mã phiếu", "Loại", "Khách hàng", "Số tiền", "Mô tả", "Người tạo"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        int rowNum = 1;
        int stt = 1;
        
        // Customer payments
        Map<Long, User> userCache = new HashMap<>();
        for (CustomerAdvancePayment payment : customerPayments.stream()
                .filter(p -> p.getStatus() == CustomerAdvancePayment.Status.SUBMITTED 
                        || p.getStatus() == CustomerAdvancePayment.Status.RECONCILED)
                .collect(Collectors.toList())) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            Cell dateCell = row.createCell(1);
            dateCell.setCellValue(payment.getCollectedAt());
            dateCell.setCellStyle(dateStyle);
            row.createCell(2).setCellValue("CAP-" + payment.getId());
            row.createCell(3).setCellValue("Thu từ khách hàng");
            row.createCell(4).setCellValue(payment.getCustomerName() + " - " + payment.getCustomerPhone());
            Cell amountCell = row.createCell(5);
            amountCell.setCellValue(payment.getAmount());
            amountCell.setCellStyle(currencyStyle);
            row.createCell(6).setCellValue(payment.getNote() != null ? payment.getNote() : "");
            row.createCell(7).setCellValue(getUserName(payment.getCollectedBy(), userCache));
        }
        
        // Other income transactions
        for (CompanyTransaction transaction : incomeTransactions) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            Cell dateCell = row.createCell(1);
            dateCell.setCellValue(transaction.getCreatedAt());
            dateCell.setCellStyle(dateStyle);
            row.createCell(2).setCellValue("TXN-" + transaction.getId());
            row.createCell(3).setCellValue("Thu khác");
            row.createCell(4).setCellValue("");
            Cell amountCell = row.createCell(5);
            amountCell.setCellValue(transaction.getAmount());
            amountCell.setCellStyle(currencyStyle);
            row.createCell(6).setCellValue(transaction.getDescription() != null ? transaction.getDescription() : "");
            row.createCell(7).setCellValue(getUserName(transaction.getCreatedBy(), userCache));
        }
        
        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void createExpenseDetailSheet(Workbook workbook, CellStyle headerStyle,
                                         CellStyle currencyStyle, CellStyle dateStyle,
                                         List<CompanyTransaction> expenseTransactions,
                                         List<ExpenseVoucher> expenseVouchers,
                                         List<DriverExpenseAdvance> driverAdvances) {
        Sheet sheet = workbook.createSheet("Chi tiết chi");
        
        // Header
        Row headerRow = sheet.createRow(0);
        String[] headers = {"STT", "Ngày", "Mã phiếu", "Loại", "Danh mục", "Người nhận", "Số tiền", "Mô tả", "Người tạo", "Trạng thái"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        int rowNum = 1;
        int stt = 1;
        Map<Long, User> userCache = new HashMap<>();
        
        // Expense vouchers
        for (ExpenseVoucher voucher : expenseVouchers) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            Cell dateCell = row.createCell(1);
            dateCell.setCellValue(voucher.getCreatedAt());
            dateCell.setCellStyle(dateStyle);
            row.createCell(2).setCellValue(voucher.getCode() != null ? voucher.getCode() : "EXP-" + voucher.getId());
            row.createCell(3).setCellValue("Phiếu chi");
            row.createCell(4).setCellValue(getCategoryLabel(voucher.getCategory()));
            row.createCell(5).setCellValue(voucher.getPayeeName());
            Cell amountCell = row.createCell(6);
            amountCell.setCellValue(voucher.getAmount());
            amountCell.setCellStyle(currencyStyle);
            row.createCell(7).setCellValue(voucher.getDescription() != null ? voucher.getDescription() : "");
            row.createCell(8).setCellValue(getUserName(voucher.getCreatedBy(), userCache));
            row.createCell(9).setCellValue(getStatusLabel(voucher.getStatus()));
        }
        
        // Driver advances (transferred)
        for (DriverExpenseAdvance advance : driverAdvances.stream()
                .filter(d -> d.getStatus() == DriverExpenseAdvance.Status.TRANSFERRED)
                .collect(Collectors.toList())) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            Cell dateCell = row.createCell(1);
            dateCell.setCellValue(advance.getTransferredAt() != null ? advance.getTransferredAt() : advance.getRequestedAt());
            dateCell.setCellStyle(dateStyle);
            row.createCell(2).setCellValue("DEA-" + advance.getId());
            row.createCell(3).setCellValue("Tạm ứng tài xế");
            row.createCell(4).setCellValue(getExpenseTypeLabel(advance.getExpenseType()));
            row.createCell(5).setCellValue("Tài xế #" + advance.getDriverId());
            Cell amountCell = row.createCell(6);
            amountCell.setCellValue(advance.getAmount());
            amountCell.setCellStyle(currencyStyle);
            row.createCell(7).setCellValue(advance.getNote() != null ? advance.getNote() : "");
            row.createCell(8).setCellValue(getUserName(advance.getTransferredBy(), userCache));
            row.createCell(9).setCellValue("Đã chuyển tiền");
        }
        
        // Other expense transactions
        for (CompanyTransaction transaction : expenseTransactions) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            Cell dateCell = row.createCell(1);
            dateCell.setCellValue(transaction.getCreatedAt());
            dateCell.setCellStyle(dateStyle);
            row.createCell(2).setCellValue("TXN-" + transaction.getId());
            row.createCell(3).setCellValue("Chi khác");
            row.createCell(4).setCellValue("");
            row.createCell(5).setCellValue("");
            Cell amountCell = row.createCell(6);
            amountCell.setCellValue(transaction.getAmount());
            amountCell.setCellStyle(currencyStyle);
            row.createCell(7).setCellValue(transaction.getDescription() != null ? transaction.getDescription() : "");
            row.createCell(8).setCellValue(getUserName(transaction.getCreatedBy(), userCache));
            row.createCell(9).setCellValue("");
        }
        
        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void createCustomerDebtSheet(Workbook workbook, CellStyle headerStyle,
                                        CellStyle currencyStyle, CellStyle dateStyle,
                                        List<CustomerAdvancePayment> customerDebts) {
        Sheet sheet = workbook.createSheet("Công nợ khách hàng");
        
        // Header
        Row headerRow = sheet.createRow(0);
        String[] headers = {"STT", "Mã phiếu", "Khách hàng", "Số điện thoại", "Chuyến", "Số tiền", "Trạng thái", "Ngày tạo", "Ghi chú"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        int rowNum = 1;
        int stt = 1;
        
        for (CustomerAdvancePayment payment : customerDebts) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            row.createCell(1).setCellValue("CAP-" + payment.getId());
            row.createCell(2).setCellValue(payment.getCustomerName());
            row.createCell(3).setCellValue(payment.getCustomerPhone());
            row.createCell(4).setCellValue(payment.getTripId() != null ? "#" + payment.getTripId() : "");
            Cell amountCell = row.createCell(5);
            amountCell.setCellValue(payment.getAmount());
            amountCell.setCellStyle(currencyStyle);
            row.createCell(6).setCellValue(getCustomerStatusLabel(payment.getStatus()));
            Cell dateCell = row.createCell(7);
            dateCell.setCellValue(payment.getCollectedAt());
            dateCell.setCellStyle(dateStyle);
            row.createCell(8).setCellValue(payment.getNote() != null ? payment.getNote() : "");
        }
        
        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void createDriverDebtSheet(Workbook workbook, CellStyle headerStyle,
                                      CellStyle currencyStyle, CellStyle dateStyle,
                                      List<DriverExpenseAdvance> driverDebts) {
        Sheet sheet = workbook.createSheet("Công nợ tài xế");
        
        // Header
        Row headerRow = sheet.createRow(0);
        String[] headers = {"STT", "Mã phiếu", "Tài xế", "Chuyến", "Loại chi phí", "Số tiền", "Trạng thái", "Ngày tạo", "Ghi chú"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        int rowNum = 1;
        int stt = 1;
        Map<Long, User> userCache = new HashMap<>();
        
        for (DriverExpenseAdvance advance : driverDebts) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            row.createCell(1).setCellValue("DEA-" + advance.getId());
            row.createCell(2).setCellValue(getUserName(advance.getDriverId(), userCache));
            row.createCell(3).setCellValue(advance.getTripId() != null ? "#" + advance.getTripId() : "");
            row.createCell(4).setCellValue(getExpenseTypeLabel(advance.getExpenseType()));
            Cell amountCell = row.createCell(5);
            amountCell.setCellValue(advance.getAmount());
            amountCell.setCellStyle(currencyStyle);
            row.createCell(6).setCellValue(getDriverStatusLabel(advance.getStatus()));
            Cell dateCell = row.createCell(7);
            dateCell.setCellValue(advance.getRequestedAt());
            dateCell.setCellStyle(dateStyle);
            row.createCell(8).setCellValue(advance.getNote() != null ? advance.getNote() : "");
        }
        
        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private String getUserName(Long userId, Map<Long, User> cache) {
        if (userId == null) return "";
        if (cache.containsKey(userId)) {
            return cache.get(userId).getName();
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            cache.put(userId, user);
            return user.getName();
        }
        return "User #" + userId;
    }

    private String getCategoryLabel(ExpenseVoucher.Category category) {
        switch (category) {
            case OFFICE_RENT: return "Thuê văn phòng";
            case ELECTRICITY: return "Điện";
            case WATER: return "Nước";
            case SALARY: return "Lương nhân viên";
            case DRIVER_ADVANCE: return "Tạm ứng tài xế";
            case OPERATIONS: return "Chi phí vận hành";
            case OTHER: return "Khác";
            default: return category.name();
        }
    }

    private String getStatusLabel(ExpenseVoucher.Status status) {
        switch (status) {
            case DRAFT: return "Nháp";
            case PENDING: return "Chờ duyệt";
            case APPROVED: return "Đã duyệt";
            case PAID: return "Đã chuyển tiền";
            case REJECTED: return "Từ chối";
            default: return status.name();
        }
    }

    private String getExpenseTypeLabel(DriverExpenseAdvance.ExpenseType type) {
        switch (type) {
            case TOLL: return "Phí cầu đường";
            case PARKING: return "Phí bến bãi";
            case FUEL: return "Nhiên liệu";
            case OTHER: return "Khác";
            default: return type.name();
        }
    }

    private String getDriverStatusLabel(DriverExpenseAdvance.Status status) {
        switch (status) {
            case REQUESTED: return "Chờ duyệt";
            case APPROVED: return "Đã duyệt";
            case TRANSFERRED: return "Đã chuyển tiền";
            case DEDUCTED: return "Đã khấu trừ";
            case REJECTED: return "Từ chối";
            default: return status.name();
        }
    }

    private String getCustomerStatusLabel(CustomerAdvancePayment.Status status) {
        switch (status) {
            case PENDING: return "Chờ nộp";
            case SUBMITTED: return "Đã nộp";
            case RECONCILED: return "Đã đối soát";
            case REJECTED: return "Từ chối";
            default: return status.name();
        }
    }

    private void createPaymentHistorySheet(Workbook workbook, CellStyle headerStyle,
                                          CellStyle currencyStyle, CellStyle dateStyle,
                                          List<TripPayment> tripPayments) {
        Sheet sheet = workbook.createSheet("Lịch sử thu tiền");
        
        // Header
        Row headerRow = sheet.createRow(0);
        String[] headers = {"STT", "Ngày thu", "Tài xế", "Chuyến", "Khách hàng", "SĐT Khách", 
                           "Điểm đón", "Điểm trả", "Số tiền", "Phương thức", "Ghi chú", "Người ghi nhận"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        int rowNum = 1;
        int stt = 1;
        Map<Long, User> userCache = new HashMap<>();
        Map<Long, Trip> tripCache = new HashMap<>();
        
        for (TripPayment payment : tripPayments) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            
            // Date
            Cell dateCell = row.createCell(1);
            dateCell.setCellValue(payment.getCollectedAt());
            dateCell.setCellStyle(dateStyle);
            
            // Get trip details
            String driverName = "";
            String customerName = "";
            String customerPhone = "";
            String pickup = "";
            String dropoff = "";
            
            if (payment.getTripId() != null) {
                Trip trip = getTripFromCache(payment.getTripId(), tripCache);
                if (trip != null) {
                    if (trip.getDriverId() != null) {
                        driverName = getUserName(trip.getDriverId(), userCache);
                    }
                    customerName = trip.getCustomerName() != null ? trip.getCustomerName() : "";
                    customerPhone = trip.getCustomerPhone() != null ? trip.getCustomerPhone() : "";
                    pickup = trip.getPickupLocation() != null ? trip.getPickupLocation() : "";
                    dropoff = trip.getDropoffLocation() != null ? trip.getDropoffLocation() : "";
                }
            }
            
            row.createCell(2).setCellValue(driverName);
            row.createCell(3).setCellValue(payment.getTripId() != null ? "#" + payment.getTripId() : "");
            row.createCell(4).setCellValue(customerName);
            row.createCell(5).setCellValue(customerPhone);
            row.createCell(6).setCellValue(pickup);
            row.createCell(7).setCellValue(dropoff);
            
            // Amount
            Cell amountCell = row.createCell(8);
            amountCell.setCellValue(payment.getAmount());
            amountCell.setCellStyle(currencyStyle);
            
            // Method
            String method = payment.getMethod() != null ? payment.getMethod().name() : "";
            row.createCell(9).setCellValue(method.equals("CASH") ? "Tiền mặt" : "Chuyển khoản");
            
            // Note - skip if not available
            row.createCell(10).setCellValue("");
            
            // Recorded by - skip if not available
            row.createCell(11).setCellValue("");
        }
        
        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void createDepositHistorySheet(Workbook workbook, CellStyle headerStyle,
                                          CellStyle currencyStyle, CellStyle dateStyle,
                                          List<DepositRecord> depositRecords) {
        Sheet sheet = workbook.createSheet("Lịch sử nộp tiền");
        
        // Header
        Row headerRow = sheet.createRow(0);
        String[] headers = {"STT", "Ngày nộp", "Tài xế", "Số tiền", "Số chứng từ", "Ghi chú", "Người ghi nhận"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        int rowNum = 1;
        int stt = 1;
        Map<Long, User> userCache = new HashMap<>();
        
        for (DepositRecord depositRecord : depositRecords) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            
            // Date
            Cell dateCell = row.createCell(1);
            dateCell.setCellValue(depositRecord.getCreatedAt());
            dateCell.setCellStyle(dateStyle);
            
            // Driver
            String driverName = getUserName(depositRecord.getDriverId(), userCache);
            row.createCell(2).setCellValue(driverName);
            
            // Amount
            Cell amountCell = row.createCell(3);
            amountCell.setCellValue(depositRecord.getAmount());
            amountCell.setCellStyle(currencyStyle);
            
            // Attachments - not available in entity
            row.createCell(4).setCellValue("N/A");
            
            // Note
            row.createCell(5).setCellValue(depositRecord.getNote() != null ? depositRecord.getNote() : "");
            
            // Recorded by - skip if not available
            row.createCell(6).setCellValue("");
        }
        
        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private Trip getTripFromCache(Long tripId, Map<Long, Trip> cache) {
        if (tripId == null) return null;
        if (cache.containsKey(tripId)) {
            return cache.get(tripId);
        }
        Trip trip = tripRepository.findById(tripId).orElse(null);
        if (trip != null) {
            cache.put(tripId, trip);
        }
        return trip;
    }

    private void createTripSummarySheet(Workbook workbook, CellStyle headerStyle,
                                       CellStyle currencyStyle, CellStyle dateStyle,
                                       Date fromDate, Date toDate) {
        Sheet sheet = workbook.createSheet("Tổng hợp chuyến đi");
        
        // Header
        Row headerRow = sheet.createRow(0);
        String[] headers = {"STT", "Mã chuyến", "Ngày hoàn thành", "Tài xế", "Khách hàng", "SĐT", 
                           "Điểm đón", "Điểm trả", "Loại", "Giá chuyến", "Đã thu từ khách", 
                           "Đã nộp về CT", "Còn phải nộp", "Trạng thái", "Ghi chú"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        // Query completed trips
        List<Trip> trips = tripRepository.findAll().stream()
                .filter(trip -> trip.getStatus() == Trip.TripStatus.HOAN_THANH)
                .filter(trip -> trip.getCompletedAt() != null && 
                               !trip.getCompletedAt().before(fromDate) && 
                               !trip.getCompletedAt().after(toDate))
                .collect(Collectors.toList());
        
        // Sort by completed date
        trips.sort(Comparator.comparing(Trip::getCompletedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        
        // Get all trip IDs
        List<Long> tripIds = trips.stream().map(Trip::getId).collect(Collectors.toList());
        
        // Query payments and deposits
        List<TripPayment> allPayments = tripPaymentRepository.findAll().stream()
                .filter(p -> tripIds.contains(p.getTripId()))
                .collect(Collectors.toList());
        
        List<DepositRecord> allDeposits = depositRecordRepository.findAll().stream()
                .filter(d -> d.getTripId() != null && tripIds.contains(d.getTripId()))
                .collect(Collectors.toList());
        
        // Calculate per trip
        Map<Long, Double> collectedPerTrip = new HashMap<>();
        for (TripPayment payment : allPayments) {
            collectedPerTrip.merge(payment.getTripId(), payment.getAmount(), Double::sum);
        }
        
        Map<Long, Double> depositedPerTrip = new HashMap<>();
        for (DepositRecord deposit : allDeposits) {
            depositedPerTrip.merge(deposit.getTripId(), deposit.getAmount(), Double::sum);
        }
        
        // Populate data
        int rowNum = 1;
        int stt = 1;
        Map<Long, User> userCache = new HashMap<>();
        
        for (Trip trip : trips) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(stt++);
            row.createCell(1).setCellValue("#" + trip.getId());
            
            // Completed date
            Cell dateCell = row.createCell(2);
            if (trip.getCompletedAt() != null) {
                dateCell.setCellValue(trip.getCompletedAt());
                dateCell.setCellStyle(dateStyle);
            }
            
            // Driver
            row.createCell(3).setCellValue(getUserName(trip.getDriverId(), userCache));
            
            // Customer info
            row.createCell(4).setCellValue(trip.getCustomerName() != null ? trip.getCustomerName() : "");
            row.createCell(5).setCellValue(trip.getCustomerPhone() != null ? trip.getCustomerPhone() : "");
            
            // Locations
            row.createCell(6).setCellValue(trip.getPickupLocation() != null ? trip.getPickupLocation() : "");
            row.createCell(7).setCellValue(trip.getDropoffLocation() != null ? trip.getDropoffLocation() : "");
            
            // Type
            String tripType = Boolean.TRUE.equals(trip.getFullVehicle()) ? "Bao xe" : 
                            (trip.getPassengers() != null ? trip.getPassengers() + " người" : "");
            row.createCell(8).setCellValue(tripType);
            
            // Price
            Cell priceCell = row.createCell(9);
            double price = trip.getPrice() != null ? trip.getPrice().doubleValue() : 0.0;
            priceCell.setCellValue(price);
            priceCell.setCellStyle(currencyStyle);
            
            // Collected from customer
            Cell collectedCell = row.createCell(10);
            double collected = collectedPerTrip.getOrDefault(trip.getId(), 0.0);
            collectedCell.setCellValue(collected);
            collectedCell.setCellStyle(currencyStyle);
            
            // Deposited to company
            Cell depositedCell = row.createCell(11);
            double deposited = depositedPerTrip.getOrDefault(trip.getId(), 0.0);
            depositedCell.setCellValue(deposited);
            depositedCell.setCellStyle(currencyStyle);
            
            // Remaining
            Cell remainingCell = row.createCell(12);
            double remaining = price - deposited;
            remainingCell.setCellValue(remaining);
            remainingCell.setCellStyle(currencyStyle);
            
            // Status
            String status = deposited >= price ? "✓ Đã đủ" : 
                           deposited > 0 ? "Còn thiếu" : "Chưa nộp";
            row.createCell(13).setCellValue(status);
            
            // Note
            row.createCell(14).setCellValue(trip.getNotes() != null ? trip.getNotes() : "");
        }
        
        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }
}

