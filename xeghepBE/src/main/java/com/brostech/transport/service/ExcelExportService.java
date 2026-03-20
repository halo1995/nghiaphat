package com.brostech.transport.service;

import com.brostech.transport.dto.expense.ExpenseVoucherDTO;
import com.brostech.transport.dto.payment.AccountingSummaryDTO;
import com.brostech.transport.dto.payment.DriverAccountingSummaryDTO;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExcelExportService {

    public byte[] exportAccountingSummary(AccountingSummaryDTO summary) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Tỏng Hợp Kế Toán");

            Row header = sheet.createRow(0);
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            String[] columns = {"Tài xế", "Doanh thu", "Cuốc xe", "Đã nộp", "Khách chuyển khoản", "Dư nợ", "Tạm ứng chưa trừ"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            if (summary.getByDriver() != null) {
                for (DriverAccountingSummaryDTO driver : summary.getByDriver()) {
                    Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(driver.getDriverName() != null ? driver.getDriverName() : String.valueOf(driver.getDriverId()));
                    row.createCell(1).setCellValue(driver.getTotalCollected() != null ? driver.getTotalCollected() : 0.0);
                    row.createCell(2).setCellValue(driver.getCompletedTrips() != null ? driver.getCompletedTrips() : 0);
                    row.createCell(3).setCellValue(driver.getTotalDeposited() != null ? driver.getTotalDeposited() : 0.0);
                    row.createCell(4).setCellValue(0.0); // Không có thông tin khách CK trong tổng kết kế toán
                    row.createCell(5).setCellValue(driver.getOutstanding() != null ? driver.getOutstanding() : 0.0);
                    row.createCell(6).setCellValue(driver.getAdvanceOutstanding() != null ? driver.getAdvanceOutstanding() : 0.0);
                }
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportExpenseVouchers(List<ExpenseVoucherDTO> vouchers) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Phiếu Chi");

            Row header = sheet.createRow(0);
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            String[] columns = {"Mã Phiếu", "Danh mục", "Mô tả", "Số tiền", "Ngày tạo", "Trạng thái"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (ExpenseVoucherDTO v : vouchers) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue("PC-" + v.getId());
                row.createCell(1).setCellValue(v.getCategory());
                row.createCell(2).setCellValue(v.getDescription());
                row.createCell(3).setCellValue(v.getAmount() != null ? v.getAmount() : 0.0);
                row.createCell(4).setCellValue(v.getCreatedAt() != null ? v.getCreatedAt().toString() : "");
                row.createCell(5).setCellValue(v.getStatus());
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
