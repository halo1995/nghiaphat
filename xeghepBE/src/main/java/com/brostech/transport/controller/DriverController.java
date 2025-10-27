package com.brostech.transport.controller;

import com.brostech.transport.dto.driver.DriverDTO;
import com.brostech.transport.dto.driver.DriverRequest;
import com.brostech.transport.service.DriverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/drivers")
public class DriverController {

    private final DriverService driverService;

    @PostMapping
    public DriverDTO create(@Valid @RequestBody DriverRequest req) {
        return driverService.create(req);
    }

    @GetMapping("/{id}")
    public DriverDTO get(@PathVariable Long id) {
        return driverService.getById(id);
    }

    @GetMapping
    public Page<DriverDTO> search(@RequestParam(value = "q", required = false) String keyword,
                                  Pageable pageable) {
        return driverService.search(keyword, pageable);
    }

    @PutMapping("/{id}")
    public DriverDTO update(@PathVariable Long id, @Valid @RequestBody DriverRequest req) {
        return driverService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        driverService.delete(id);
    }
}
