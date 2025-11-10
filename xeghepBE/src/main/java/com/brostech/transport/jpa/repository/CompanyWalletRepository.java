package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.CompanyWallet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyWalletRepository extends JpaRepository<CompanyWallet, Long> {

    Optional<CompanyWallet> findByName(String name);
}
