package com.brostech.transport.service;

import com.brostech.transport.dto.trip.TripDTO;
import com.brostech.transport.dto.trip.TripRequest;
import com.brostech.transport.dto.trip.TripStatusHistoryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface TripService {
    TripDTO create(TripRequest req);

    TripDTO getById(Long id);

    Page<TripDTO> search(String status, String date, Pageable pageable);

    TripDTO update(Long id, TripRequest req);

    void delete(Long id);

    List<TripStatusHistoryDTO> getStatusHistory(Long tripId);

    TripDTO getRecentTripByCustomerPhone(String customerPhone);
}
