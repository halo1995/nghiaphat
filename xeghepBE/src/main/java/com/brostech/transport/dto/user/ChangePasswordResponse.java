package com.brostech.transport.dto.user;

import lombok.*;

@Data
@Builder
public class ChangePasswordResponse {
    private String message;
    private boolean success;
}
