package com.brostech.transport.dto.driver;

import com.brostech.transport.jpa.entity.User;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DriverRequest {
    @NotBlank
    private String username;
    private String password;
    @NotBlank
    private String name;
    private String phone;
    private String email;
    private String licenseNumber;
    private String licenseExpiry;
    private String address;
    private String dateOfBirth;
    private String joinDate;
    private User.DriverStatus status = User.DriverStatus.HOAT_DONG;
    private Long vehicleId;
}
