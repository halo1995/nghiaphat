package com.brostech.transport.dto.route;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RouteDTO {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String startPoint;
    private String endPoint;
}
