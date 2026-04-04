package com.brostech.transport.service;

import com.brostech.transport.configuration.GoogleSheetsProperties;
import com.brostech.transport.jpa.entity.DepositRecord;
import com.brostech.transport.jpa.entity.ExpenseVoucher;
import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.entity.TripPayment;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleSheetsService {

    private final GoogleSheetsProperties properties;
    private Sheets sheetsService;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    private final SimpleDateFormat shortDateFormat = new SimpleDateFormat("yyyy-MM-dd");

    @PostConstruct
    public void init() {
        if (!properties.isEnabled()) {
            log.info("Google Sheets Backup is disabled.");
            return;
        }

        try {
            if (!StringUtils.hasText(properties.getSpreadsheetId())) {
                log.warn("Google Sheets enabled but SPREADSHEET_ID is missing.");
                return;
            }
            if (!StringUtils.hasText(properties.getCredentialsJson())) {
                log.warn("Google Sheets enabled but CREDENTIALS_JSON is missing.");
                return;
            }

            JsonFactory jsonFactory = GsonFactory.getDefaultInstance();
            NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            
            byte[] decodedCredentials = Base64.getDecoder().decode(properties.getCredentialsJson());
            GoogleCredentials credentials = GoogleCredentials.fromStream(new ByteArrayInputStream(decodedCredentials))
                    .createScoped(Collections.singleton(SheetsScopes.SPREADSHEETS));
            HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);

            sheetsService = new Sheets.Builder(httpTransport, jsonFactory, requestInitializer)
                    .setApplicationName("Transport System Backup")
                    .build();

            log.info("Google Sheets Service initialized successfully.");
        } catch (Exception e) {
            log.error("Failed to initialize Google Sheets API", e);
        }
    }

    private boolean isReady() {
        return properties.isEnabled() && sheetsService != null;
    }

    @Async("sheetsTaskExecutor")
    public void appendTripRow(Trip trip) {
        if (!isReady()) return;
        try {
            List<Object> values = Arrays.asList(
                    trip.getId() != null ? trip.getId().toString() : "",
                    trip.getDriverName() != null ? trip.getDriverName() : "",
                    trip.getCustomerName() != null ? trip.getCustomerName() : "",
                    trip.getCustomerPhone() != null ? trip.getCustomerPhone() : "",
                    trip.getPickupLocation() != null ? trip.getPickupLocation() : "",
                    trip.getDropoffLocation() != null ? trip.getDropoffLocation() : "",
                    formatDate(trip.getPickupTime()),
                    trip.getPrice() != null ? trip.getPrice().toString() : "0",
                    trip.getStatus() != null ? trip.getStatus().name() : "",
                    trip.getNotes() != null ? trip.getNotes() : "",
                    formatDate(new Date()) // Updated/Created at
            );

            ValueRange body = new ValueRange().setValues(Collections.singletonList(values));
            String range = properties.getSheetNames().getTrips() + "!A:K";
            
            sheetsService.spreadsheets().values()
                    .append(properties.getSpreadsheetId(), range, body)
                    .setValueInputOption("USER_ENTERED")
                    .execute();
            log.info("Appended trip {} to Google Sheets.", trip.getId());
        } catch (Exception e) {
            log.error("Failed to append trip {} to Google Sheets", trip.getId(), e);
        }
    }

    @Async("sheetsTaskExecutor")
    public void updateTripRow(Trip trip) {
        if (!isReady()) return;
        try {
            if (trip.getId() == null) return;
            
            String sheetName = properties.getSheetNames().getTrips();
            String range = sheetName + "!A:A"; // Read only column A (Trip ID)
            ValueRange response = sheetsService.spreadsheets().values()
                    .get(properties.getSpreadsheetId(), range)
                    .execute();

            List<List<Object>> values = response.getValues();
            int rowIndex = -1;
            if (values != null) {
                for (int i = 0; i < values.size(); i++) {
                    List<Object> row = values.get(i);
                    if (!row.isEmpty() && String.valueOf(trip.getId()).equals(row.get(0).toString())) {
                        rowIndex = i + 1; // Sheets is 1-indexed
                        break;
                    }
                }
            }

            if (rowIndex != -1) {
                // Update existing row
                List<Object> rowValues = Arrays.asList(
                        trip.getId().toString(),
                        trip.getDriverName() != null ? trip.getDriverName() : "",
                        trip.getCustomerName() != null ? trip.getCustomerName() : "",
                        trip.getCustomerPhone() != null ? trip.getCustomerPhone() : "",
                        trip.getPickupLocation() != null ? trip.getPickupLocation() : "",
                        trip.getDropoffLocation() != null ? trip.getDropoffLocation() : "",
                        formatDate(trip.getPickupTime()),
                        trip.getPrice() != null ? trip.getPrice().toString() : "0",
                        trip.getStatus() != null ? trip.getStatus().name() : "",
                        trip.getNotes() != null ? trip.getNotes() : "",
                        formatDate(new Date())
                );
                ValueRange body = new ValueRange().setValues(Collections.singletonList(rowValues));
                String updateRange = sheetName + "!A" + rowIndex + ":K" + rowIndex;
                
                sheetsService.spreadsheets().values()
                        .update(properties.getSpreadsheetId(), updateRange, body)
                        .setValueInputOption("USER_ENTERED")
                        .execute();
                log.info("Updated trip {} in Google Sheets.", trip.getId());
            } else {
                // Row not found, fallback to append
                appendTripRow(trip);
            }
        } catch (Exception e) {
            log.error("Failed to update trip {} in Google Sheets", trip.getId(), e);
        }
    }

    @Async("sheetsTaskExecutor")
    public void appendTripPaymentRow(TripPayment payment, Trip trip) {
        if (!isReady()) return;
        try {
            List<Object> values = Arrays.asList(
                    payment.getId() != null ? payment.getId().toString() : "",
                    formatDate(payment.getCollectedAt()),
                    trip != null && trip.getDriverName() != null ? trip.getDriverName() : payment.getDriverId(),
                    payment.getTripId() != null ? payment.getTripId().toString() : "",
                    payment.getAmount() != null ? payment.getAmount().toString() : "0",
                    payment.getMethod() != null ? payment.getMethod().name() : "",
                    formatDate(new Date())
            );

            ValueRange body = new ValueRange().setValues(Collections.singletonList(values));
            String range = properties.getSheetNames().getTripPayments() + "!A:G";
            
            sheetsService.spreadsheets().values()
                    .append(properties.getSpreadsheetId(), range, body)
                    .setValueInputOption("USER_ENTERED")
                    .execute();
            log.info("Appended trip payment {} to Google Sheets.", payment.getId());
        } catch (Exception e) {
            log.error("Failed to append trip payment {} to Google Sheets", payment.getId(), e);
        }
    }

    @Async("sheetsTaskExecutor")
    public void appendDepositRow(DepositRecord deposit) {
        if (!isReady()) return;
        try {
            List<Object> values = Arrays.asList(
                    deposit.getId() != null ? deposit.getId().toString() : "",
                    formatDate(deposit.getCreatedAt()),
                    deposit.getDriverId() != null ? deposit.getDriverId().toString() : "",
                    deposit.getAmount() != null ? deposit.getAmount().toString() : "0",
                    deposit.getPaymentMethod() != null ? deposit.getPaymentMethod().name() : "",
                    deposit.getNote() != null ? deposit.getNote() : "",
                    formatDate(new Date())
            );

            ValueRange body = new ValueRange().setValues(Collections.singletonList(values));
            String range = properties.getSheetNames().getDepositRecords() + "!A:G";
            
            sheetsService.spreadsheets().values()
                    .append(properties.getSpreadsheetId(), range, body)
                    .setValueInputOption("USER_ENTERED")
                    .execute();
            log.info("Appended deposit record {} to Google Sheets.", deposit.getId());
        } catch (Exception e) {
            log.error("Failed to append deposit record {} to Google Sheets", deposit.getId(), e);
        }
    }

    @Async("sheetsTaskExecutor")
    public void appendOrUpdateExpenseVoucherRow(ExpenseVoucher voucher) {
        if (!isReady()) return;
        try {
            if (voucher.getId() == null) return;
            
            String sheetName = properties.getSheetNames().getExpenseVouchers();
            String range = sheetName + "!A:A"; // Read only column A (Voucher ID)
            ValueRange response = sheetsService.spreadsheets().values()
                    .get(properties.getSpreadsheetId(), range)
                    .execute();

            List<List<Object>> values = response.getValues();
            int rowIndex = -1;
            if (values != null) {
                for (int i = 0; i < values.size(); i++) {
                    List<Object> row = values.get(i);
                    if (!row.isEmpty() && String.valueOf(voucher.getId()).equals(row.get(0).toString())) {
                        rowIndex = i + 1;
                        break;
                    }
                }
            }

            List<Object> rowValues = Arrays.asList(
                    voucher.getId().toString(),
                    voucher.getCode() != null ? voucher.getCode() : "",
                    formatShortDate(voucher.getCreatedAt()),
                    voucher.getCategory() != null ? voucher.getCategory().name() : "",
                    voucher.getAmount() != null ? voucher.getAmount().toString() : "0",
                    voucher.getPayeeName() != null ? voucher.getPayeeName() : "",
                    voucher.getStatus() != null ? voucher.getStatus().name() : "",
                    voucher.getTitle() != null ? voucher.getTitle() : "",
                    formatDate(new Date())
            );
            ValueRange body = new ValueRange().setValues(Collections.singletonList(rowValues));

            if (rowIndex != -1) {
                // Update
                String updateRange = sheetName + "!A" + rowIndex + ":I" + rowIndex;
                sheetsService.spreadsheets().values()
                        .update(properties.getSpreadsheetId(), updateRange, body)
                        .setValueInputOption("USER_ENTERED")
                        .execute();
                log.info("Updated expense voucher {} in Google Sheets.", voucher.getId());
            } else {
                // Append
                String appendRange = sheetName + "!A:I";
                sheetsService.spreadsheets().values()
                        .append(properties.getSpreadsheetId(), appendRange, body)
                        .setValueInputOption("USER_ENTERED")
                        .execute();
                log.info("Appended expense voucher {} to Google Sheets.", voucher.getId());
            }
        } catch (Exception e) {
            log.error("Failed to append/update expense voucher {} in Google Sheets", voucher.getId(), e);
        }
    }

    private String formatDate(Date date) {
        return date != null ? dateFormat.format(date) : "";
    }
    
    private String formatShortDate(Date date) {
        return date != null ? shortDateFormat.format(date) : "";
    }
    
    public Sheets getSheetsService() {
        return this.sheetsService;
    }
}
