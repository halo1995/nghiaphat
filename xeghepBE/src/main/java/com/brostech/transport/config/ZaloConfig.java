package com.brostech.transport.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;

@Configuration
@ConfigurationProperties(prefix = "zalo")
@Data
public class ZaloConfig {
    private App app = new App();
    private Template template = new Template();
    private Zns zns = new Zns();

    @Data
    public static class App {
        private String id;
        private String secretKey;
        private String accessToken;
    }

    @Data
    public static class Template {
        private String id;
    }

    @Data
    public static class Zns {
        private String apiUrl = "https://business.openapi.zalo.me/message/template";
    }
}
