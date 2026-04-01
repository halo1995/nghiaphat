package com.brostech.transport.controller;

import com.brostech.transport.dto.customer.CustomerDTO;
import com.brostech.transport.dto.customer.CustomerRequest;
import com.brostech.transport.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/transport-service/customers")
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public CustomerDTO create(@Valid @RequestBody CustomerRequest req) {
        return customerService.create(req);
    }

    @GetMapping("/{id}")
    public CustomerDTO get(@PathVariable Long id) {
        return customerService.getById(id);
    }

    @GetMapping
    public Page<CustomerDTO> search(@RequestParam(value = "q", required = false) String keyword,
                                    Pageable pageable) {
        return customerService.search(keyword, pageable);
    }

    @PutMapping("/{id}")
    public CustomerDTO update(@PathVariable Long id, @Valid @RequestBody CustomerRequest req) {
        return customerService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        customerService.delete(id);
    }
}
