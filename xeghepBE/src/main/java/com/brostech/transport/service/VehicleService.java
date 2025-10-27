package com.brostech.transport.service;

import com.brostech.transport.dto.vehicle.VehicleDTO;
import com.brostech.transport.dto.vehicle.VehicleRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface VehicleService {
    VehicleDTO create(VehicleRequest req);
    VehicleDTO getById(Long id);
    Page<VehicleDTO> search(String keyword, Pageable pageable);
    VehicleDTO update(Long id, VehicleRequest req);
    void delete(Long id);
}
