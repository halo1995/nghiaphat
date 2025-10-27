package com.brostech.transport.service;

import com.brostech.transport.dto.trip.TripDTO;
import com.brostech.transport.dto.trip.TripRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TripService {
    TripDTO create(TripRequest req);
    TripDTO getById(Long id);
    Page<TripDTO> search(String status, Pageable pageable);
    TripDTO update(Long id, TripRequest req);
    void delete(Long id);
}
