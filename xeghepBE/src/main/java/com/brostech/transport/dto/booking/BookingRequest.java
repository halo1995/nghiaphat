package com.brostech.transport.dto.booking;

import com.brostech.transport.common.enums.BookingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookingRequest {
    @NotNull
    private Long tripId;
    @NotNull
    private Long customerId;
    @NotBlank
    private String seatNumber;
    private BookingStatus status;

    // Pickup/Dropoff details
    @NotBlank
    private String pickupPoint;
    @NotBlank
    private String dropoffPoint;
    @NotNull
    private LocalDateTime pickupTime;
    @NotNull
    private LocalDateTime dropoffTime;

    @NotNull
    private Integer numberOfPassengers;
    private String specialRequests;

    // Payment
    private Boolean isPaid;
    private String paymentMethod;
}
