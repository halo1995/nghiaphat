package com.brostech.transport.dto.routestop;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RouteStopDTO {
    private Long id;
    private Long routeId;
    private Long stopPointId;
    private String stopPointName;
    private Integer stopOrder;
}
