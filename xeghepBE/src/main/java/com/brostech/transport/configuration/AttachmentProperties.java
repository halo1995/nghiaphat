package com.brostech.transport.configuration;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@Data
@Validated
@Component
@ConfigurationProperties(prefix = "payment.attachments")
public class AttachmentProperties {

    @NotBlank
    private String baseDir = "./data/ticket-images";

    @Min(1)
    private int retentionDays = 40;

    @Min(1)
    private int maxFiles = 3;

    @Min(1)
    private long maxFileSizeBytes = 10 * 1024 * 1024L;
}
