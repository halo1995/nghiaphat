package com.brostech.transport.dto.booking;

import com.brostech.transport.common.enums.BookingStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BookingDTO {
    private Long id;
    private Long tripId;
    private Long customerId;
    private String seatNumber;
    private BookingStatus status;
    private Boolean isPaid;
    private String paymentMethod;
}
