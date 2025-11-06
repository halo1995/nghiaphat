package com.brostech.transport.jpa.repository;

import com.brostech.transport.jpa.entity.PaymentAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Date;
import java.util.List;

public interface PaymentAttachmentRepository extends JpaRepository<PaymentAttachment, Long> {

    List<PaymentAttachment> findByReferenceTypeAndReferenceId(PaymentAttachment.ReferenceType referenceType, Long referenceId);

    List<PaymentAttachment> findByReferenceTypeAndReferenceIdIn(PaymentAttachment.ReferenceType referenceType, Collection<Long> referenceIds);

    long countByReferenceTypeAndReferenceId(PaymentAttachment.ReferenceType referenceType, Long referenceId);

    List<PaymentAttachment> findByExpiresAtBefore(Date expiresAt);

    void deleteByReferenceTypeAndReferenceId(PaymentAttachment.ReferenceType referenceType, Long referenceId);
}
