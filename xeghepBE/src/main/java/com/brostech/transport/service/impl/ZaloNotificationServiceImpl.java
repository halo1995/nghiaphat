package com.brostech.transport.service.impl;

import com.brostech.transport.config.ZaloConfig;
import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.entity.User;
import com.brostech.transport.jpa.entity.Vehicle;
import com.brostech.transport.jpa.entity.CustomerAdvancePayment;
import com.brostech.transport.jpa.repository.CustomerAdvancePaymentRepository;
import com.brostech.transport.service.ZaloNotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ZaloNotificationServiceImpl implements ZaloNotificationService {

    private final ZaloConfig zaloConfig;
    private final CustomerAdvancePaymentRepository customerAdvancePaymentRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean sendTripConfirmation(Trip trip, User driver, Vehicle vehicle) {
        try {
            // Check if Zalo is configured
            if (zaloConfig.getApp().getAccessToken() == null || zaloConfig.getApp().getAccessToken().isEmpty()) {
                log.warn("Zalo ZNS is not configured. Skipping notification.");
                return false;
            }

            // Build message payload
            Map<String, Object> payload = buildPayload(trip, driver, vehicle);

            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("access_token", zaloConfig.getApp().getAccessToken());

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            // Send request to Zalo ZNS API
            log.info("Sending Zalo notification for trip {} to customer {}", trip.getId(), trip.getCustomerPhone());
            String response = restTemplate.postForObject(zaloConfig.getZns().getApiUrl(), request, String.class);
            
            log.info("Zalo ZNS response: {}", response);
            
            // Parse response to check success
            Map<String, Object> responseMap = objectMapper.readValue(response, Map.class);
            Integer errorCode = (Integer) responseMap.get("error");
            
            if (errorCode != null && errorCode == 0) {
                log.info("Successfully sent Zalo notification for trip {}", trip.getId());
                return true;
            } else {
                log.error("Failed to send Zalo notification. Error code: {}, Message: {}", 
                    errorCode, responseMap.get("message"));
                return false;
            }

        } catch (Exception e) {
            log.error("Error sending Zalo notification for trip {}: {}", trip.getId(), e.getMessage(), e);
            return false;
        }
    }

    private Map<String, Object> buildPayload(Trip trip, User driver, Vehicle vehicle) {
        Map<String, Object> payload = new HashMap<>();
        
        // Phone number (must include country code for Zalo)
        String phone = normalizePhone(trip.getCustomerPhone());
        payload.put("phone", phone);
        
        // Template ID
        payload.put("template_id", zaloConfig.getTemplate().getId());
        
        // Template data
        Map<String, Object> templateData = new HashMap<>();
        templateData.put("driver_name", driver.getName() != null ? driver.getName() : "Tài xế");
        templateData.put("license_plate", vehicle != null && vehicle.getLicensePlate() != null 
            ? vehicle.getLicensePlate() : "Đang cập nhật");
        templateData.put("pickup_location", trip.getPickupLocation());
        templateData.put("destination", trip.getDropoffLocation());
        
        // Calculate outstanding amount = price - reconciled advances
        java.math.BigDecimal outstandingAmount = calculateOutstandingAmount(trip);
        templateData.put("price", formatCurrency(outstandingAmount));
        
        templateData.put("pickup_time", formatDateTime(trip.getPickupTime()));
        
        payload.put("template_data", templateData);
        
        // Tracking ID (optional, for debugging)
        payload.put("tracking_id", "trip_" + trip.getId());
        
        return payload;
    }

    private String normalizePhone(String phone) {
        // Remove all non-digit characters
        String cleaned = phone.replaceAll("[^0-9]", "");
        
        // If starts with 0, replace with 84
        if (cleaned.startsWith("0")) {
            cleaned = "84" + cleaned.substring(1);
        }
        
        // If doesn't start with 84, add it
        if (!cleaned.startsWith("84")) {
            cleaned = "84" + cleaned;
        }
        
        return cleaned;
    }

    private String formatCurrency(java.math.BigDecimal amount) {
        if (amount == null) return "0";
        NumberFormat formatter = NumberFormat.getInstance(new Locale("vi", "VN"));
        return formatter.format(amount);
    }

    private String formatDateTime(java.util.Date date) {
        if (date == null) return "";
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm dd/MM/yyyy");
        return sdf.format(date);
    }

    private java.math.BigDecimal calculateOutstandingAmount(Trip trip) {
        try {
            // Get sum of reconciled advances for this trip using repository query
            Double totalReconciledAmount = customerAdvancePaymentRepository.sumAmountByTripIdAndStatus(
                trip.getId(), 
                CustomerAdvancePayment.Status.RECONCILED
            );

            // Convert to BigDecimal (repository returns Double, may be null)
            java.math.BigDecimal totalReconciled = totalReconciledAmount != null 
                ? java.math.BigDecimal.valueOf(totalReconciledAmount)
                : java.math.BigDecimal.ZERO;

            // Calculate outstanding = price - reconciled
            java.math.BigDecimal outstanding = trip.getPrice().subtract(totalReconciled);

            // Return 0 if negative (overpaid)
            if (outstanding.compareTo(java.math.BigDecimal.ZERO) < 0) {
                log.info("Trip {} is overpaid. Price: {}, Reconciled: {}", 
                    trip.getId(), trip.getPrice(), totalReconciled);
                return java.math.BigDecimal.ZERO;
            }

            log.debug("Trip {} outstanding amount: {} (Price: {}, Reconciled: {})", 
                trip.getId(), outstanding, trip.getPrice(), totalReconciled);
            
            return outstanding;

        } catch (Exception e) {
            log.warn("Error calculating outstanding amount for trip {}, using full price: {}", 
                trip.getId(), e.getMessage());
            return trip.getPrice();
        }
    }
}
