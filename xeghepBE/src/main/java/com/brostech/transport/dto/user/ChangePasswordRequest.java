package com.brostech.transport.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotNull
    private Long userId;
    
    @NotBlank
    private String oldPassword;
    
    @NotBlank
    private String newPassword;
}
