package com.brostech.transport.middleware;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/*
 * Trong Spring các dữ liệu body đều nằm trong InputStream nên khi gọi 1 lần thì stream đó sẽ không thể goij được nữa
 * Vì vậy class này sinh ra để hỗ trợ cho việc gọi lấy body nhiều lần mà không ảnh hưởng đến các tính năng khác
 * */
@Component
@Order(-1000)
public class RequestResponseCopyFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain) throws ServletException, IOException {
        HttpRequestWrapper httpRequestWrapper = new HttpRequestWrapper(request);
        HttpResponseWrapper httpResponseWrapper = new HttpResponseWrapper(response);
        filterChain.doFilter(httpRequestWrapper, httpResponseWrapper);
    }

}
