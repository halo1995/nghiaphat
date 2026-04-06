package com.brostech.transport.configuration;

import com.brostech.transport.service.GoogleSheetsService;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.BatchUpdateSpreadsheetRequest;
import com.google.api.services.sheets.v4.model.AddSheetRequest;
import com.google.api.services.sheets.v4.model.Request;
import com.google.api.services.sheets.v4.model.SheetProperties;
import com.google.api.services.sheets.v4.model.Spreadsheet;
import com.google.api.services.sheets.v4.model.Sheet;
import com.google.api.services.sheets.v4.model.ValueRange;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class GoogleSheetsInitializer {

    private final GoogleSheetsProperties properties;
    private final GoogleSheetsService googleSheetsService;

    @EventListener(ApplicationReadyEvent.class)
    public void initializeSheets() {
        if (!properties.isEnabled()) {
            return;
        }
        Sheets sheetsApi = googleSheetsService.getSheetsService();
        if (sheetsApi == null) {
            log.warn("Google Sheets service is not ready. Skipping initialization.");
            return;
        }

        try {
            String spreadsheetId = properties.getSpreadsheetId();
            Spreadsheet spreadsheet = sheetsApi.spreadsheets().get(spreadsheetId).execute();
            List<Sheet> existingSheets = spreadsheet.getSheets();
            List<String> existingTitles = new ArrayList<>();
            for (Sheet sheet : existingSheets) {
                existingTitles.add(sheet.getProperties().getTitle());
            }

            GoogleSheetsProperties.SheetNames names = properties.getSheetNames();
            
            // 1. Chuyến đi
            ensureSheetExistsAndHasHeaders(sheetsApi, spreadsheetId, existingTitles, names.getTrips(), Arrays.asList(
                    "Mã Chuyến", "Tài xế", "Khách hàng", "SĐT", "Điểm đón", "Điểm trả", "Giờ đón", "Giá", "Trạng thái", "Ghi chú", "Lần cập nhật cuối"
            ));

            // 2. Thu tiền
            ensureSheetExistsAndHasHeaders(sheetsApi, spreadsheetId, existingTitles, names.getTripPayments(), Arrays.asList(
                    "Mã Thu Tiền", "Ngày Thu", "Tài xế", "Mã Chuyến", "Số Tiền", "Phương Thức", "Lần cập nhật cuối"
            ));

            // 3. Nộp tiền
            ensureSheetExistsAndHasHeaders(sheetsApi, spreadsheetId, existingTitles, names.getDepositRecords(), Arrays.asList(
                    "Mã Nộp Tiền", "Ngày Nộp", "Mã Tài xế", "Số Tiền", "Phương Thức", "Ghi Chú", "Lần cập nhật cuối"
            ));

            // 4. Phiếu chi
            ensureSheetExistsAndHasHeaders(sheetsApi, spreadsheetId, existingTitles, names.getExpenseVouchers(), Arrays.asList(
                    "ID Mạng", "Mã Phiếu", "Ngày Tạo", "Loại", "Số Tiền", "Người Nhận", "Trạng Thái", "Tiêu đề", "Lần cập nhật cuối"
            ));

            log.info("Google Sheets tabs initialized successfully.");
        } catch (Exception e) {
            log.error("Failed to initialize Google Sheets tabs", e);
        }
    }

    private void ensureSheetExistsAndHasHeaders(Sheets sheetsApi, String spreadsheetId, List<String> existingTitles, String sheetTitle, List<Object> headers) throws Exception {
        if (!existingTitles.contains(sheetTitle)) {
            log.info("Creating new sheet tab: {}", sheetTitle);
            List<Request> requests = new ArrayList<>();
            requests.add(new Request().setAddSheet(new AddSheetRequest()
                    .setProperties(new SheetProperties().setTitle(sheetTitle))));
            
            BatchUpdateSpreadsheetRequest body = new BatchUpdateSpreadsheetRequest().setRequests(requests);
            sheetsApi.spreadsheets().batchUpdate(spreadsheetId, body).execute();
            existingTitles.add(sheetTitle);

            // Add headers
            ValueRange headerRange = new ValueRange().setValues(Collections.singletonList(headers));
            sheetsApi.spreadsheets().values()
                    .update(spreadsheetId, sheetTitle + "!A1:Z1", headerRange)
                    .setValueInputOption("USER_ENTERED")
                    .execute();
            log.info("Added headers to sheet tab: {}", sheetTitle);
        }
    }
}
