package com.brostech.transport.controller;

import com.brostech.transport.dto.user.*;
import com.brostech.transport.jpa.entity.AuthToken;
import com.brostech.transport.jpa.repository.AuthTokenRepository;
import com.brostech.transport.service.JwtService;
import com.brostech.transport.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final AuthTokenRepository authTokenRepository;

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        UserDTO userDTO = userService.login(request.getUsername(), request.getPassword());

        authTokenRepository.deleteAllByUserId(userDTO.getId());

        String token = jwtService.generateToken(userDTO);

        LocalDateTime expiresAt = jwtService.extractExpiration(token)
                .toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();

        AuthToken authToken = AuthToken.builder()
                .token(token)
                .userId(userDTO.getId())
                .createdAt(LocalDateTime.now())
                .expiresAt(expiresAt)
                .build();
        authTokenRepository.save(authToken);

        LoginResponse response = LoginResponse.builder()
                .user(userDTO)
                .token(token)
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<ChangePasswordResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request.getUserId(), request.getOldPassword(), request.getNewPassword());

        ChangePasswordResponse response = ChangePasswordResponse.builder()
                .message("Đổi mật khẩu thành công")
                .success(true)
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public Page<UserDTO> getUsers(@RequestParam(value = "q", required = false) String keyword,
                                  Pageable pageable) {
        return userService.getAllUsers(keyword, pageable);
    }

    @PostMapping("/users")
    public UserDTO createUser(@Valid @RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }

    @PutMapping("/users/{id}")
    public UserDTO updateUser(@PathVariable Long id, @Valid @RequestBody CreateUserRequest request) {
        return userService.updateUser(id, request);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
