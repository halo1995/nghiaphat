package com.brostech.transport.service;

import com.brostech.transport.dto.driver.DriverDTO;
import com.brostech.transport.dto.driver.DriverRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DriverService {
    DriverDTO create(DriverRequest req);
    DriverDTO getById(Long id);
    Page<DriverDTO> search(String keyword, Pageable pageable);
    DriverDTO update(Long id, DriverRequest req);
    void delete(Long id);
}
