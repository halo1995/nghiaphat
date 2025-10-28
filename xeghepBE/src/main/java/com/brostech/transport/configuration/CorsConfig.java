// package com.brostech.transport.configuration;

// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.web.cors.CorsConfiguration;
// import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
// import org.springframework.web.filter.CorsFilter;

// import java.util.Arrays;

// @Configuration
// public class CorsConfig {

//     @Bean
//     public CorsFilter corsFilter() {
//         CorsConfiguration config = new CorsConfiguration();
//         config.setAllowCredentials(true);
//         config.setAllowedOriginPatterns(Arrays.asList("http://localhost:*", "http://127.0.0.1:*", "https://xeghepnghiaphat.io.vn", "https://www.xeghepnghiaphat.io.vn" ));
//         config.setAllowedHeaders(Arrays.asList("*"));
//         config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
//         config.setExposedHeaders(Arrays.asList("*"));
        
//         UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
//         source.registerCorsConfiguration("/**", config);
        
//         return new CorsFilter(source);
//     }
// }
