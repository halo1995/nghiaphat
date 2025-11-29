package com.brostech.transport.controller;

import com.brostech.transport.dto.trip.TripDTO;
import com.brostech.transport.dto.trip.TripRequest;
import com.brostech.transport.service.TripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("transport-service/trips")
public class TripController {

    private final TripService tripService;

    @PostMapping
    public TripDTO create(@Valid @RequestBody TripRequest req) {
        return tripService.create(req);
    }

    @GetMapping("/{id}")
    public TripDTO get(@PathVariable Long id) {
        return tripService.getById(id);
    }

    @GetMapping
    public Page<TripDTO> search(@RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "date", required = false) String date,
            Pageable pageable) {
        return tripService.search(status, date, pageable);
    }

    @PutMapping("/{id}")
    public TripDTO update(@PathVariable Long id, @Valid @RequestBody TripRequest req) {
        return tripService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        tripService.delete(id);
    }
}
