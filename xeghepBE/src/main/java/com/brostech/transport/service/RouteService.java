package com.brostech.transport.service;

import com.brostech.transport.dto.route.RouteDTO;
import com.brostech.transport.dto.route.RouteRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RouteService {
    RouteDTO create(RouteRequest req);
    RouteDTO getById(Long id);
    Page<RouteDTO> search(String keyword, Pageable pageable);
    RouteDTO update(Long id, RouteRequest req);
    void delete(Long id);
}
