package com.brostech.transport.aop;

import com.brostech.transport.jpa.entity.AuthToken;
import com.brostech.transport.jpa.repository.AuthTokenRepository;
import com.brostech.transport.service.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@RequiredArgsConstructor
public class AuthenticationAspect {

    private final JwtService jwtService;
    private final AuthTokenRepository authTokenRepository;
    private final UserDetailsService userDetailsService;

    @Around("@annotation(RequireAuth)")
    public Object authenticate(ProceedingJoinPoint joinPoint) throws Throwable {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Missing or invalid authorization header");
        }

        String token = authHeader.substring(7);

        AuthToken authToken = authTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid token"));

        if (authToken.isExpired()) {
            authTokenRepository.delete(authToken);
            throw new RuntimeException("Token expired or invalid");
        }

        String username = jwtService.extractUsername(token);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtService.isTokenValid(token, userDetails)) {
            throw new RuntimeException("Token expired or invalid");
        }

        return joinPoint.proceed();
    }
}
