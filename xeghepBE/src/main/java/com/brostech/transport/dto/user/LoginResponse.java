package com.brostech.transport.dto.user;

import lombok.*;

@Data
@Builder
public class LoginResponse {
    private UserDTO user;
    private String token;
}
