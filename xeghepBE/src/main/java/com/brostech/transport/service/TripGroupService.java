package com.brostech.transport.service;

import com.brostech.transport.dto.trip.TripGroupDTO;
import com.brostech.transport.dto.trip.TripGroupRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TripGroupService {
    TripGroupDTO create(TripGroupRequest req);

    TripGroupDTO getById(Long id);

    Page<TripGroupDTO> search(String status, String date, Pageable pageable);

    TripGroupDTO update(Long id, TripGroupRequest req);

    void delete(Long id);

    TripGroupDTO assignVehicle(Long groupId, Long vehicleId);

    TripGroupDTO assignDriver(Long groupId, Long driverId);

    TripGroupDTO addTrip(Long groupId, Long tripId);

    TripGroupDTO removeTrip(Long groupId, Long tripId);
}
