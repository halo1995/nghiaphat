CREATE TABLE customer_advance_payments (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT REFERENCES trips(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    method VARCHAR(10) NOT NULL CHECK (method IN ('CASH', 'TRANSFER')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'RECONCILED', 'REJECTED')),
    collected_by BIGINT REFERENCES users(id),
    collected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    submitted_by BIGINT REFERENCES users(id),
    reconciled_at TIMESTAMP,
    reconciled_by BIGINT REFERENCES users(id),
    receipt_code VARCHAR(64),
    note TEXT
);

CREATE INDEX idx_customer_advance_trip ON customer_advance_payments(trip_id);
CREATE INDEX idx_customer_advance_status ON customer_advance_payments(status);

CREATE TABLE driver_expense_advances (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES users(id),
    trip_id BIGINT REFERENCES trips(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    expense_type VARCHAR(20) NOT NULL CHECK (expense_type IN ('TOLL', 'PARKING', 'FUEL', 'OTHER')),
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'DEDUCTED', 'REJECTED')),
    requested_by BIGINT REFERENCES users(id),
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP,
    deducted_by BIGINT REFERENCES users(id),
    deducted_at TIMESTAMP,
    rejection_reason TEXT,
    note TEXT
);

CREATE INDEX idx_driver_expense_driver ON driver_expense_advances(driver_id);
CREATE INDEX idx_driver_expense_status ON driver_expense_advances(status);
