CREATE TABLE IF NOT EXISTS payment_attachments (
    id BIGSERIAL PRIMARY KEY,
    reference_type VARCHAR(32) NOT NULL,
    reference_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    content_type VARCHAR(128),
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(128),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_attachments_reference
    ON payment_attachments (reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_payment_attachments_expires
    ON payment_attachments (expires_at);
