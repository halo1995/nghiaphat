package com.brostech.transport.service;

import com.brostech.transport.common.util.JWTUtils;
import com.brostech.transport.dto.user.UserDTO;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JwtService {

    @Value("${jwt.secret:mySecretKey}")
    private String secret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    public String extractUsername(String token) {
        return JWTUtils.extractUsername(token, secret);
    }

    public Long extractUserId(String token) {
        return JWTUtils.extractUserId(token, secret);
    }

    public String extractRole(String token) {
        return JWTUtils.extractRole(token, secret);
    }

    public Date extractExpiration(String token) {
        return JWTUtils.extractExpiration(token, secret);
    }

    public String generateToken(UserDTO user) {
        Map<String, Object> extraClaims = new HashMap<>();
        Long userId = null;
        String role = null;

        role = user.getRole() != null ? user.getRole().name() : null;
        userId = user.getId();

        if (StringUtils.startsWith(role, "ROLE_")) {
            role = role.substring(5);
        }
        if (role != null) {
            extraClaims.put("role", role);
        }
        if (userId != null) {
            extraClaims.put("userId", userId);
        }
        return JWTUtils.generateToken(user.getUsername(), extraClaims, secret, jwtExpiration);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            return JWTUtils.validateToken(token, userDetails.getUsername(), secret);
        } catch (Exception ex) {
            return false;
        }
    }
}
