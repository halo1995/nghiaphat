package com.brostech.transport.service;

import com.brostech.transport.dto.customer.CustomerDTO;
import com.brostech.transport.dto.customer.CustomerRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CustomerService {
    CustomerDTO create(CustomerRequest req);
    CustomerDTO getById(Long id);
    Page<CustomerDTO> search(String keyword, Pageable pageable);
    CustomerDTO update(Long id, CustomerRequest req);
    void delete(Long id);
}
