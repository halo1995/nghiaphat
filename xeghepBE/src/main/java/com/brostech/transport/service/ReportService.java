package com.brostech.transport.service;

import org.springframework.core.io.Resource;

public interface ReportService {
    Resource generateAccountingReport(String from, String to);
}

