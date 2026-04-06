package com.brostech.transport.service;

import com.brostech.transport.jpa.entity.Customer;
import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.repository.CustomerRepository;
import com.brostech.transport.jpa.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelImportService {

    private final TripRepository tripRepository;
    private final CustomerRepository customerRepository;
    private final GoongGeocodeService goongGeocodeService;
    private final LocationMappingService locationMappingService;

    public static class ImportResult {
        public int successCount = 0;
        public int errorCount = 0;
        public List<String> errors = new ArrayList<>();
    }

    private String sanitizeAddress(String address) {
        if (address == null) return "";
        // Replace abbreviations based on user rules
        String sanitized = address.replaceAll("(?i)\\bNQ\\b", "Nho Quan, Ninh Bình");
        sanitized = sanitized.replaceAll("(?i)\\bHN\\b", "Hà Nội");
        return sanitized;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
                }
                double d = cell.getNumericCellValue();
                if (d == (long) d)
                    return String.format("%d", (long) d);
                else
                    return String.format("%s", d);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    try {
                        return String.valueOf(cell.getNumericCellValue());
                    } catch (Exception ex) {
                        return "";
                    }
                }
            default:
                return "";
        }
    }

    public ImportResult importTripsFromExcel(MultipartFile file) {
        ImportResult result = new ImportResult();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            // Find headers
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                result.errors.add("Không tìm thấy dòng tiêu đề");
                return result;
            }

            int customerIdx = -1, phoneIdx = -1, pickupIdx = -1, dropoffIdx = -1, passengersIdx = -1;
            int dateIdx = -1, timeIdx = -1, priceIdx = -1, notesIdx = -1, driverIdx = -1;

            for (Cell cell : headerRow) {
                String header = getCellValueAsString(cell).toUpperCase();
                if (header.contains("TÊN KHÁCH")) customerIdx = cell.getColumnIndex();
                else if (header.equals("SDT") || header.contains("ĐIỆN THOẠI")) phoneIdx = cell.getColumnIndex();
                else if (header.contains("ĐIỂM ĐÓN")) pickupIdx = cell.getColumnIndex();
                else if (header.contains("ĐIỂM TRẢ")) dropoffIdx = cell.getColumnIndex();
                else if (header.contains("SỐ VÉ") || header.contains("SL")) passengersIdx = cell.getColumnIndex();
                else if (header.contains("NGÀY ĐÓN")) dateIdx = cell.getColumnIndex();
                else if (header.contains("THỜI GIAN")) timeIdx = cell.getColumnIndex();
                else if (header.contains("GIÁ VÉ") || header.contains("CÒN PHẢI THU")) priceIdx = cell.getColumnIndex();
                else if (header.contains("GHI CHÚ")) notesIdx = cell.getColumnIndex();
                else if (header.contains("LÁI XE")) driverIdx = cell.getColumnIndex();
            }

            if (customerIdx == -1 || pickupIdx == -1 || dropoffIdx == -1) {
                result.errors.add("Thiếu các cột bắt buộc (TÊN KHÁCH, ĐIỂM ĐÓN, ĐIỂM TRẢ)");
                return result;
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String customerName = getCellValueAsString(row.getCell(customerIdx));
                if (StringUtils.isBlank(customerName)) continue;

                String customerPhone = phoneIdx != -1 ? getCellValueAsString(row.getCell(phoneIdx)) : "";
                String pickupLoc = pickupIdx != -1 ? getCellValueAsString(row.getCell(pickupIdx)) : "";
                String dropoffLoc = dropoffIdx != -1 ? getCellValueAsString(row.getCell(dropoffIdx)) : "";
                String passengersStr = passengersIdx != -1 ? getCellValueAsString(row.getCell(passengersIdx)) : "1";
                String pickupDateStr = dateIdx != -1 ? getCellValueAsString(row.getCell(dateIdx)) : "";
                String pickupTimeStr = timeIdx != -1 ? getCellValueAsString(row.getCell(timeIdx)) : "";
                String priceStr = priceIdx != -1 ? getCellValueAsString(row.getCell(priceIdx)) : "0";
                String notes = notesIdx != -1 ? getCellValueAsString(row.getCell(notesIdx)) : "";
                String driverName = driverIdx != -1 ? getCellValueAsString(row.getCell(driverIdx)) : "";

                int passengers = 1;
                try { passengers = Integer.parseInt(passengersStr); } catch (Exception ignored) {}

                BigDecimal price = BigDecimal.ZERO;
                try { price = new BigDecimal(priceStr); } catch (Exception ignored) {}

                Date pickupDate = new Date();
                try {
                    if (StringUtils.isNotBlank(pickupDateStr) && pickupDateStr.contains("/")) {
                        String[] dateParts = pickupDateStr.split(" ")[0].split("/");
                        LocalDate localDate = LocalDate.now();
                        if (dateParts.length >= 3) {
                            localDate = LocalDate.of(Integer.parseInt(dateParts[2]), Integer.parseInt(dateParts[1]), Integer.parseInt(dateParts[0]));
                        }
                        
                        LocalTime localTime = LocalTime.MIDNIGHT;
                        if (StringUtils.isNotBlank(pickupTimeStr) && !pickupTimeStr.contains("NAME?")) {
                            if (pickupTimeStr.contains(" ")) {
                                pickupTimeStr = pickupTimeStr.split(" ")[1];
                            }
                            String[] timeParts = pickupTimeStr.split(":");
                            if (timeParts.length >= 2) {
                                localTime = LocalTime.of(Integer.parseInt(timeParts[0]), Integer.parseInt(timeParts[1]));
                            }
                        }
                        pickupDate = Date.from(LocalDateTime.of(localDate, localTime).atZone(ZoneId.systemDefault()).toInstant());
                    }
                } catch (Exception e) {
                    log.warn("Could not parse date time for row {}. Using current time.", i);
                }

                // Resolve Locations
                String sPickup = sanitizeAddress(pickupLoc);
                String sDropoff = sanitizeAddress(dropoffLoc);

                LocationMappingService.ResolutionResult pickupRes = goongGeocodeService.getGeocodeResult(sPickup, locationMappingService);
                LocationMappingService.ResolutionResult dropoffRes = goongGeocodeService.getGeocodeResult(sDropoff, locationMappingService);

                if (StringUtils.isBlank(pickupRes.getProvinceCode()) || StringUtils.isBlank(dropoffRes.getProvinceCode())) {
                    result.errorCount++;
                    result.errors.add(String.format("Dòng %d: Không thể phân giải địa chỉ đón/trả cho %s", i, customerName));
                    continue;
                }

                Trip trip = Trip.builder()
                        .customerName(customerName)
                        .customerPhone(customerPhone)
                        .pickupLocation(pickupLoc)
                        .pickupProvinceCode(pickupRes.getProvinceCode())
                        .pickupWardCode(pickupRes.getWardCode() != null ? pickupRes.getWardCode() : pickupRes.getDistrictCode())
                        .dropoffLocation(dropoffLoc)
                        .dropoffProvinceCode(dropoffRes.getProvinceCode())
                        .dropoffWardCode(dropoffRes.getWardCode() != null ? dropoffRes.getWardCode() : dropoffRes.getDistrictCode())
                        .pickupTime(pickupDate)
                        .distance(0)
                        .price(price)
                        .passengers(passengers)
                        .notes(notes)
                        .driverName(StringUtils.isNotBlank(driverName) ? driverName : null)
                        .status(Trip.TripStatus.HOAN_THANH)
                        .createdAt(new Date())
                        .fullVehicle(false)
                        .pickupConfirmed(false)
                        .dropoffConfirmed(false)
                        .build();

                tripRepository.save(trip);
                
                // Cập nhật thông tin khách hàng nếu có SĐT
                if (StringUtils.isNotBlank(customerPhone)) {
                    Optional<Customer> optCustomer = customerRepository.findFirstByPhoneOrderByIdAsc(customerPhone);
                    Customer customer;
                    if (optCustomer.isPresent()) {
                        customer = optCustomer.get();
                        customer.setTotalTrips((customer.getTotalTrips() != null ? customer.getTotalTrips() : 0) + 1);
                        customer.setTotalSpent((customer.getTotalSpent() != null ? customer.getTotalSpent() : 0.0) + price.doubleValue());
                        // Cập nhật tên nếu trước đó chưa có hoặc muốn ghi đè
                        if (StringUtils.isBlank(customer.getName())) {
                            customer.setName(customerName);
                        }
                    } else {
                        customer = Customer.builder()
                                .name(customerName)
                                .phone(customerPhone)
                                .totalTrips(1)
                                .totalSpent(price.doubleValue())
                                .status(Customer.CustomerStatus.HOAT_DONG)
                                .joinDate(new Date())
                                .build();
                    }
                    customerRepository.save(customer);
                }

                result.successCount++;
            }

        } catch (Exception e) {
            log.error("Failed to parse excel file", e);
            result.errors.add("Lỗi hệ thống khi đọc file: " + e.getMessage());
        }

        return result;
    }
}
