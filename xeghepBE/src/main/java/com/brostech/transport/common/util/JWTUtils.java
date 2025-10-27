package com.brostech.transport.common.util;

import com.auth0.jwt.JWT;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

public final class JWTUtils {

    private JWTUtils() {
    }

    private static final String BEARER = "Bearer ";
    private static final String AUTHORIZATION = "Authorization";
    private static final String ROLE_CLAIM = "role";
    private static final String USER_ID_CLAIM = "userId";

    public static String generateToken(String username,
                                       String role,
                                       Long userId,
                                       String secret,
                                       long expirationMillis) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(ROLE_CLAIM, role);
        if (userId != null) {
            claims.put(USER_ID_CLAIM, userId);
        }
        return generateToken(username, claims, secret, expirationMillis);
    }

    public static String generateToken(String username,
                                       Map<String, Object> claims,
                                       String secret,
                                       long expirationMillis) {
        Date issuedAt = new Date();
        Date expiration = new Date(issuedAt.getTime() + expirationMillis);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(issuedAt)
                .setExpiration(expiration)
                .signWith(getSigningKey(secret), SignatureAlgorithm.HS256)
                .compact();
    }

    public static boolean validateToken(String token, String username, String secret) {
        if (StringUtils.isBlank(token) || StringUtils.isBlank(username)) {
            return false;
        }
        String extractedUsername = extractUsername(token, secret);
        return username.equals(extractedUsername) && !isTokenExpired(token, secret);
    }

    public static String extractUsername(String token, String secret) {
        return extractAllClaims(token, secret).getSubject();
    }

    public static String extractRole(String token, String secret) {
        return extractAllClaims(token, secret).get(ROLE_CLAIM, String.class);
    }

    public static Long extractUserId(String token, String secret) {
        return extractAllClaims(token, secret).get(USER_ID_CLAIM, Long.class);
    }

    public static Date extractExpiration(String token, String secret) {
        return extractAllClaims(token, secret).getExpiration();
    }

    public static Claims extractAllClaims(String token, String secret) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey(secret))
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public static boolean isTokenExpired(String token, String secret) {
        Date expiration = extractExpiration(token, secret);
        return expiration.before(new Date());
    }

    public static String getUsername() {
        try {
            HttpServletRequest request = ((ServletRequestAttributes) Objects.requireNonNull(RequestContextHolder.getRequestAttributes())).getRequest();
            String authorization = request.getHeader(AUTHORIZATION);
            String token = StringUtils.isNotBlank(authorization) ? authorization.replace(BEARER, "") : "";
            if (StringUtils.isBlank(token)) {
                return "";
            }
            return JWT.decode(token).getSubject();
        } catch (Exception e) {
            return "";
        }
    }

    public static String getRole() {
        try {
            HttpServletRequest request = ((ServletRequestAttributes) Objects.requireNonNull(RequestContextHolder.getRequestAttributes())).getRequest();
            String authorization = request.getHeader(AUTHORIZATION);
            String token = StringUtils.isNotBlank(authorization) ? authorization.replace(BEARER, "") : "";
            if (StringUtils.isBlank(token)) {
                return "";
            }
            return JWT.decode(token).getClaim(ROLE_CLAIM).asString();
        } catch (Exception e) {
            return "";
        }
    }

    public static String getToken() {
        try {
            HttpServletRequest request = ((ServletRequestAttributes) Objects.requireNonNull(RequestContextHolder.getRequestAttributes())).getRequest();
            String authorization = request.getHeader(AUTHORIZATION);
            return StringUtils.isNotBlank(authorization) ? authorization.replace(BEARER, "") : "";
        } catch (Exception e) {
            return "";
        }
    }

    private static Key getSigningKey(String secret) {
        byte[] keyBytes = decodeSecret(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private static byte[] decodeSecret(String secret) {
        if (StringUtils.isBlank(secret)) {
            return new byte[0];
        }
        try {
            return Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ex) {
            try {
                return Decoders.BASE64.decode(secret);
            } catch (IllegalArgumentException ignored) {
                return secret.getBytes(StandardCharsets.UTF_8);
            }
        }
    }
}
