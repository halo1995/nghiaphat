package com.brostech.transport.dto.routestop;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RouteStopRequest {
    @NotNull
    private Long routeId;
    @NotNull
    private Long stopPointId;
    // optional: if null -> append to the end
    private Integer stopOrder;
}
