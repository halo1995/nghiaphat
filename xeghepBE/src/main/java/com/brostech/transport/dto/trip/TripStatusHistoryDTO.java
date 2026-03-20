package com.brostech.transport.dto.trip;

import com.brostech.transport.jpa.entity.Trip;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripStatusHistoryDTO {
    private Long id;
    private Long tripId;
    private Trip.TripStatus fromStatus;
    private Trip.TripStatus toStatus;
    private String actionAt;
    private String actionBy;
    private String actionByName;
    private String note;
}
