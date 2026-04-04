package com.brostech.transport.configuration;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình Google Sheets Backup.
 * Đọc từ application.yaml hoặc biến môi trường.
 *
 * Các biến môi trường tương ứng:
 *   GOOGLE_SHEETS_ENABLED          → bật/tắt tính năng (default: false)
 *   GOOGLE_SHEETS_SPREADSHEET_ID   → ID của Google Spreadsheet
 *   GOOGLE_SHEETS_CREDENTIALS_JSON → Nội dung JSON Service Account key (base64 encoded)
 */
@Data
@Component
@ConfigurationProperties(prefix = "google.sheets")
public class GoogleSheetsProperties {

    /**
     * Bật/tắt tính năng đồng bộ Google Sheets.
     * Đặt false để tắt hoàn toàn mà không cần thay code.
     */
    private boolean enabled = false;

    /**
     * ID của Google Spreadsheet.
     * Lấy từ URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
     */
    private String spreadsheetId;

    /**
     * Nội dung JSON của Google Service Account key, đã được base64 encode.
     * Cách encode: base64 -i service-account.json
     */
    private String credentialsJson;

    /**
     * Tên các sheet tab trong Spreadsheet.
     * Có thể override qua config nếu cần đổi tên.
     */
    private SheetNames sheetNames = new SheetNames();

    @Data
    public static class SheetNames {
        private String trips = "Chuyến đi";
        private String tripPayments = "Thu tiền";
        private String depositRecords = "Nộp tiền";
        private String expenseVouchers = "Phiếu chi";
    }
}
