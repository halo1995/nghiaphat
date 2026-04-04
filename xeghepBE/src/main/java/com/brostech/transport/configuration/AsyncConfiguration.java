package com.brostech.transport.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Cấu hình Async ThreadPool riêng cho Google Sheets sync.
 * Sử dụng thread pool độc lập để không ảnh hưởng đến main request thread pool.
 */
@Configuration
@EnableAsync
public class AsyncConfiguration {

    /**
     * ThreadPoolTaskExecutor riêng cho Google Sheets.
     * - corePoolSize = 2: luôn có ít nhất 2 thread sẵn sàng
     * - maxPoolSize = 5: tối đa 5 thread đồng thời ghi Sheets
     * - queueCapacity = 100: buffer tối đa 100 task nếu threads bận
     * - Prefix "sheets-" để dễ debug trong log
     */
    @Bean(name = "sheetsTaskExecutor")
    public Executor sheetsTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("sheets-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
