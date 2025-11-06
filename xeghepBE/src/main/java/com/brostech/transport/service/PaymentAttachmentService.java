package com.brostech.transport.service;

import com.brostech.transport.configuration.AttachmentProperties;
import com.brostech.transport.jpa.entity.PaymentAttachment;
import com.brostech.transport.jpa.repository.PaymentAttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.DigestUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentAttachmentService {

    private final PaymentAttachmentRepository attachmentRepository;
    private final AttachmentProperties attachmentProperties;

    public List<PaymentAttachment> storeAttachments(PaymentAttachment.ReferenceType referenceType,
                                                    Long referenceId,
                                                    List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return Collections.emptyList();
        }

        List<MultipartFile> nonEmptyFiles = files.stream()
                .filter(file -> file != null && !file.isEmpty())
                .toList();

        if (nonEmptyFiles.isEmpty()) {
            return Collections.emptyList();
        }

        long existingCount = attachmentRepository.countByReferenceTypeAndReferenceId(referenceType, referenceId);
        int maxAllowed = attachmentProperties.getMaxFiles();
        if (existingCount + nonEmptyFiles.size() > maxAllowed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Số lượng ảnh vượt quá giới hạn cho phép (" + maxAllowed + ")");
        }

        List<PaymentAttachment> saved = new ArrayList<>(nonEmptyFiles.size());
        Path baseDir = resolveBaseDir();
        Path referenceDir = baseDir
                .resolve(referenceType.name().toLowerCase(Locale.ROOT))
                .resolve(referenceId.toString());

        try {
            Files.createDirectories(referenceDir);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo thư mục lưu ảnh", e);
        }

        for (MultipartFile file : nonEmptyFiles) {
            validateFileSize(file);
            String sanitizedName = sanitizeFileName(file.getOriginalFilename());
            String storedName = UUID.randomUUID() + "_" + sanitizedName;
            Path target = referenceDir.resolve(storedName);

            try {
                try (var inputStream = file.getInputStream()) {
                    Files.copy(inputStream, target);
                }
            } catch (IOException e) {
                deleteQuietly(target);
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu ảnh", e);
            }

            PaymentAttachment attachment = PaymentAttachment.builder()
                    .referenceType(referenceType)
                    .referenceId(referenceId)
                    .fileName(sanitizedName)
                    .storagePath(baseDir.relativize(target).toString())
                    .contentType(file.getContentType())
                    .sizeBytes(file.getSize())
                    .checksum(calculateChecksum(file))
                    .createdAt(new Date())
                    .expiresAt(Date.from(Instant.now().plus(attachmentProperties.getRetentionDays(), ChronoUnit.DAYS)))
                    .build();
            try {
                saved.add(attachmentRepository.save(attachment));
            } catch (RuntimeException ex) {
                deleteQuietly(target);
                throw ex;
            }
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<PaymentAttachment> getAttachments(PaymentAttachment.ReferenceType referenceType, Long referenceId) {
        return attachmentRepository.findByReferenceTypeAndReferenceId(referenceType, referenceId);
    }

    public void deleteAttachments(PaymentAttachment.ReferenceType referenceType, Long referenceId) {
        List<PaymentAttachment> attachments = attachmentRepository.findByReferenceTypeAndReferenceId(referenceType, referenceId);
        for (PaymentAttachment attachment : attachments) {
            deletePhysicalFile(attachment);
        }
        attachmentRepository.deleteByReferenceTypeAndReferenceId(referenceType, referenceId);
    }

    @Transactional(readOnly = true)
    public PaymentAttachment getAttachmentOrThrow(Long id) {
        return attachmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh"));
    }

    @Transactional(readOnly = true)
    public Resource loadAsResource(PaymentAttachment attachment) {
        Path filePath = resolveBaseDir().resolve(attachment.getStoragePath()).normalize();
        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không thể đọc ảnh đã lưu");
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tải ảnh", e);
        }
    }

    public int purgeExpiredAttachments() {
        List<PaymentAttachment> expired = attachmentRepository.findByExpiresAtBefore(new Date());
        int removed = 0;
        for (PaymentAttachment attachment : expired) {
            if (deletePhysicalFile(attachment)) {
                removed++;
            }
            attachmentRepository.delete(attachment);
        }
        return removed;
    }

    private void validateFileSize(MultipartFile file) {
        long maxSize = attachmentProperties.getMaxFileSizeBytes();
        if (file.getSize() > maxSize) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format(Locale.ROOT, "Dung lượng ảnh vượt quá %d MB", maxSize / (1024 * 1024)));
        }
    }

    private boolean deletePhysicalFile(PaymentAttachment attachment) {
        Path filePath = resolveBaseDir().resolve(attachment.getStoragePath()).normalize();
        return deleteQuietly(filePath);
    }

    private Path resolveBaseDir() {
        Path baseDir = Paths.get(attachmentProperties.getBaseDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(baseDir);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo thư mục lưu ảnh", e);
        }
        return baseDir;
    }

    private String sanitizeFileName(String original) {
        String fallback = "attachment";
        if (original == null || original.isBlank()) {
            return fallback;
        }
        String normalized = Normalizer.normalize(original, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String cleaned = normalized.replaceAll("[\\\\/]+", "_")
                .replaceAll("[^A-Za-z0-9._-]", "_");
        if (cleaned.isBlank()) {
            cleaned = fallback;
        }
        if (cleaned.length() > 150) {
            cleaned = cleaned.substring(cleaned.length() - 150);
        }
        return cleaned;
    }

    private String calculateChecksum(MultipartFile file) {
        try {
            return DigestUtils.md5DigestAsHex(file.getBytes());
        } catch (IOException e) {
            return null;
        }
    }

    private boolean deleteQuietly(Path path) {
        try {
            return Files.deleteIfExists(path);
        } catch (IOException ignored) {
            return false;
        }
    }
}
