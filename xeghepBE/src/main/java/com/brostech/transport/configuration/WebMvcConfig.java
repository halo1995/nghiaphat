package com.brostech.transport.configuration;

import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {
//    @Bean
//    public WebMvcConfigurer corsConfigurer() {
//        return new WebMvcConfigurer() {
//            @Override
//            public void addCorsMappings(CorsRegistry registry) {
//                registry.addMapping("/**")
//                        .allowedOriginPatterns("*") // ✅ Cho phép tất cả origin
//                        .allowedMethods("*") // ✅ Cho phép tất cả method
//                        .allowedHeaders("*") // ✅ Cho phép tất cả header
//                        .allowCredentials(true); // ⚠️ Vẫn cho phép credentials
//            }
//        };
//    }
}
