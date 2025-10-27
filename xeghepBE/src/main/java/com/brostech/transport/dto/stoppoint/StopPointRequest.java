package com.brostech.transport.dto.stoppoint;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class StopPointRequest {
    @NotBlank
    private String name;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
}
