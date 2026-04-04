package com.brostech.transport.controller;

import com.brostech.transport.dto.driver.DriverDTO;
import com.brostech.transport.dto.driver.DriverRequest;
import com.brostech.transport.service.DriverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;
import com.brostech.transport.dto.payment.DriverTransactionDTO;
import com.brostech.transport.service.PaymentService;
import com.brostech.transport.jpa.entity.User;
import com.brostech.transport.jpa.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequiredArgsConstructor
@RequestMapping("/transport-service/drivers")
public class DriverController {

    private final DriverService driverService;
    private final PaymentService paymentService;
    private final UserRepository userRepository;

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

    @GetMapping("/{id}/daily-summary")
    public Object getDailySummary(@PathVariable Long id, @RequestParam String date) {
        return driverService.getDailySummary(id, date);
    }

    @GetMapping("/{id}/transactions")
    public Page<DriverTransactionDTO> getDriverTransactions(@PathVariable Long id, Pageable pageable) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            User user = userRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new AccessDeniedException("User not found"));
            
            if (user.getRole() == User.UserRole.DRIVER && !user.getId().equals(id)) {
                throw new AccessDeniedException("Drivers can only view their own transactions");
            }
        }
        
        return paymentService.getDriverTransactions(id, pageable);
    }
}
