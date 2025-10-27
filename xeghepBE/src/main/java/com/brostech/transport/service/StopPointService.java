package com.brostech.transport.service;

import com.brostech.transport.dto.stoppoint.StopPointDTO;
import com.brostech.transport.dto.stoppoint.StopPointRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StopPointService {
    StopPointDTO create(StopPointRequest req);
    StopPointDTO getById(Long id);
    Page<StopPointDTO> search(String keyword, Pageable pageable);
    StopPointDTO update(Long id, StopPointRequest req);
    void delete(Long id);
}
