package com.brostech.transport.service;

import com.brostech.transport.dto.booking.BookingDTO;
import com.brostech.transport.dto.booking.BookingRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface BookingService {
    BookingDTO create(BookingRequest req);
    BookingDTO getById(Long id);
    Page<BookingDTO> search(String status, Pageable pageable);
    BookingDTO update(Long id, BookingRequest req);
    void delete(Long id);
}
