package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    @Query("SELECT c FROM Customer c WHERE c.phone LIKE CONCAT(:keyword, '%')")
    Page<Customer> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    Optional<Customer> findFirstByPhoneOrderByIdAsc(String phone);
}
