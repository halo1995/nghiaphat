package com.brostech.transport.dto.route;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RouteRequest {
    @NotBlank
    private String code;
    @NotBlank
    private String name;
    private String description;
    private String startPoint;
    private String endPoint;
}
