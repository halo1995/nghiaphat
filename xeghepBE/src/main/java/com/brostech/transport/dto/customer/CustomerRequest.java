package com.brostech.transport.dto.customer;

import com.brostech.transport.jpa.entity.Customer;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerRequest {
    @NotBlank
    private String name;
    @Email
    private String email;
    private String phone;
    private String address;
    private String avatar;
    private Customer.CustomerStatus status = Customer.CustomerStatus.HOAT_DONG;
}
