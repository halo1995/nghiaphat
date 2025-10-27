package com.brostech.transport.dto.user;

import com.brostech.transport.jpa.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateUserRequest {
    @NotBlank
    private String username;
    
    @NotBlank
    private String password;
    
    @NotBlank
    private String name;
    
    private User.UserRole role;
    
    @Email
    private String email;
    
    private String phone;
    
    private String avatar;
}
