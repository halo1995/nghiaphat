package com.brostech.transport.controller;

import com.brostech.transport.dto.vehicle.VehicleDTO;
import com.brostech.transport.dto.vehicle.VehicleRequest;
import com.brostech.transport.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping
    public VehicleDTO create(@Valid @RequestBody VehicleRequest req) {
        return vehicleService.create(req);
    }

    @GetMapping("/{id}")
    public VehicleDTO get(@PathVariable Long id) {
        return vehicleService.getById(id);
    }

    @GetMapping
    public Page<VehicleDTO> search(@RequestParam(value = "q", required = false) String keyword,
                                   Pageable pageable) {
        return vehicleService.search(keyword, pageable);
    }

    @PutMapping("/{id}")
    public VehicleDTO update(@PathVariable Long id, @Valid @RequestBody VehicleRequest req) {
        return vehicleService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        vehicleService.delete(id);
    }
}
