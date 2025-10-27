package com.brostech.transport.dto.customer;

import com.brostech.transport.jpa.entity.Customer;
import lombok.*;

@Data
@Builder
public class CustomerDTO {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String joinDate;
    private Integer totalTrips;
    private Double totalSpent;
    private Double rating;
    private String avatar;
    private Customer.CustomerStatus status;
}
