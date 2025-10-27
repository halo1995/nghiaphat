package com.brostech.transport.dto.driver;

import com.brostech.transport.jpa.entity.User;
import lombok.*;

@Data
@Builder
public class DriverDTO {
    private Long id;
    private String username;
    private String name;
    private String phone;
    private String email;
    private String licenseNumber;
    private String licenseExpiry;
    private String address;
    private String dateOfBirth;
    private String joinDate;
    private User.DriverStatus status;
    private String avatar;
    private Long vehicleId;
    private Integer totalTrips;
    private Double rating;
    private Double totalEarnings;
    private Double outstandingBalance;
}
