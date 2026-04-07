package com.brostech.transport.service.impl;

import com.brostech.transport.dto.customer.CustomerDTO;
import com.brostech.transport.dto.customer.CustomerRequest;
import com.brostech.transport.jpa.entity.Customer;
import com.brostech.transport.jpa.repository.CustomerRepository;
import com.brostech.transport.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * CustomerServiceImpl
 * Nghiệp vụ: Quản lý khách hàng (tạo, tìm kiếm theo từ khóa, cập nhật, xóa).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;

    /**
     * Tạo mới khách hàng
     * @param req thông tin khách hàng
     * @return CustomerDTO đã lưu
     */
    @Override
    public CustomerDTO create(CustomerRequest req) {
        Customer customer = Customer.builder()
                .name(req.getName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .address(req.getAddress())
                .avatar(req.getAvatar())
                .status(req.getStatus())
                .build();
        customer = customerRepository.save(customer);
        return toDTO(customer);
    }

    /**
     * Lấy chi tiết khách hàng theo id
     * @param id id khách hàng
     * @return CustomerDTO; ném 404 nếu không có
     */
    @Override
    @Transactional(readOnly = true)
    public CustomerDTO getById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        return toDTO(customer);
    }

    /**
     * Tìm kiếm khách hàng theo tên (phân trang)
     * @param keyword từ khóa tên (không phân biệt hoa thường)
     * @param pageable thông tin phân trang
     */
    @Override
    @Transactional(readOnly = true)
    public Page<CustomerDTO> search(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isBlank()) {
            return customerRepository.findAll(pageable).map(this::toDTO);
        }
        return customerRepository.findByNameContainingIgnoreCaseOrPhoneContaining(keyword, keyword, pageable).map(this::toDTO);
    }

    /**
     * Cập nhật thông tin khách hàng
     * @param id id khách hàng
     * @param req dữ liệu cập nhật
     */
    @Override
    public CustomerDTO update(Long id, CustomerRequest req) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        customer.setName(req.getName());
        customer.setEmail(req.getEmail());
        customer.setPhone(req.getPhone());
        customer.setAddress(req.getAddress());
        customer.setAvatar(req.getAvatar());
        customer.setStatus(req.getStatus());
        customer = customerRepository.save(customer);
        return toDTO(customer);
    }

    /**
     * Xóa khách hàng theo id
     * @param id id khách hàng
     */
    @Override
    public void delete(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found");
        }
        customerRepository.deleteById(id);
    }

    /**
     * Map entity Customer sang DTO
     */
    private CustomerDTO toDTO(Customer customer) {
        return CustomerDTO.builder()
                .id(customer.getId())
                .name(customer.getName())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .address(customer.getAddress())
                .joinDate(customer.getJoinDate() != null ? customer.getJoinDate().toString() : null)
                .totalTrips(customer.getTotalTrips())
                .totalSpent(customer.getTotalSpent())
                .rating(customer.getRating())
                .avatar(customer.getAvatar())
                .status(customer.getStatus())
                .build();
    }
}
