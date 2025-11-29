package com.brostech.transport.dto.user;

import com.brostech.transport.jpa.entity.User;
import lombok.*;

@Data
@Builder
public class UserDTO {
    private Long id;
    private String username;
    private String name;
    private User.UserRole role;
    private String email;
    private String phone;
}
