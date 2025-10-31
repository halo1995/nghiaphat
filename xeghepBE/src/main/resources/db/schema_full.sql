-- Full database schema derived from JPA entities (users, customers, trips, payments, advances, etc.)
-- Execute this script on a fresh PostgreSQL-compatible database before applying incremental migrations.

CREATE TABLE customers (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    email               VARCHAR(64),
    phone               VARCHAR(32),
    address             VARCHAR(500),
    join_date           TIMESTAMP,
    total_trips         INTEGER DEFAULT 0,
    total_spent         DOUBLE PRECISION DEFAULT 0.0,
    rating              DOUBLE PRECISION DEFAULT 5.0,
    avatar              VARCHAR(500),
    status              VARCHAR(20) NOT NULL DEFAULT 'HOAT_DONG',
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,
    CONSTRAINT chk_customers_status CHECK (status IN ('HOAT_DONG', 'NGUNG_HOAT_DONG'))
);

CREATE TABLE vehicles (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    brand               VARCHAR(255),
    model               VARCHAR(255),
    year                INTEGER,
    license_plate       VARCHAR(32) NOT NULL UNIQUE,
    color               VARCHAR(255),
    seats               INTEGER NOT NULL,
    fuel_type           VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    mileage             INTEGER,
    last_maintenance    TIMESTAMP,
    next_maintenance    TIMESTAMP,
    image               VARCHAR(500),
    total_trips         INTEGER DEFAULT 0,
    rating              DOUBLE PRECISION DEFAULT 5.0,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,
    CONSTRAINT chk_vehicles_fuel CHECK (fuel_type IN ('XANG', 'DAU', 'DIEN', 'HYBRID')),
    CONSTRAINT chk_vehicles_status CHECK (status IN ('SAN_SANG', 'DANG_CHAY', 'BAO_TRI', 'NGUNG_HOAT_DONG'))
);

CREATE TABLE users (
    id                  BIGSERIAL PRIMARY KEY,
    username            VARCHAR(64) NOT NULL UNIQUE,
    password            VARCHAR(255) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    role                VARCHAR(20) NOT NULL,
    email               VARCHAR(255),
    phone               VARCHAR(32),
    avatar              VARCHAR(500),
    license_number      VARCHAR(64),
    license_expiry      TIMESTAMP,
    address             VARCHAR(500),
    date_of_birth       TIMESTAMP,
    join_date           TIMESTAMP,
    driver_status       VARCHAR(20),
    vehicle_id          BIGINT,
    total_trips         INTEGER NOT NULL DEFAULT 0,
    rating              DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    total_earnings      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    outstanding_balance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at          TIMESTAMP,
    last_login          TIMESTAMP,
    updated_at          TIMESTAMP,
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'DISPATCHER', 'CALL_CENTER', 'DRIVER', 'ACCOUNTANT')),
    CONSTRAINT chk_users_driver_status CHECK (driver_status IS NULL OR driver_status IN ('HOAT_DONG', 'NGHI_PHEP', 'NGUNG_HOAT_DONG')),
    CONSTRAINT fk_users_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE trips (
    id                  BIGSERIAL PRIMARY KEY,
    vehicle_id          BIGINT,
    vehicle_name        VARCHAR(255),
    driver_id           BIGINT,
    driver_name         VARCHAR(255),
    customer_name       VARCHAR(255) NOT NULL,
    customer_phone      VARCHAR(32) NOT NULL,
    pickup_location     VARCHAR(500) NOT NULL,
    pickup_province_code VARCHAR(16) NOT NULL,
    pickup_ward_code    VARCHAR(16) NOT NULL,
    dropoff_location    VARCHAR(500) NOT NULL,
    dropoff_province_code VARCHAR(16) NOT NULL,
    dropoff_ward_code   VARCHAR(16) NOT NULL,
    pickup_time         TIMESTAMP NOT NULL,
    dropoff_time        TIMESTAMP,
    distance            INTEGER,
    price               NUMERIC(15,2) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    passengers          INTEGER NOT NULL,
    notes               VARCHAR(1000),
    rating              INTEGER,
    created_at          TIMESTAMP NOT NULL,
    confirmed_at        TIMESTAMP,
    assigned_at         TIMESTAMP,
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,
    pickup_confirmed    BOOLEAN,
    dropoff_confirmed   BOOLEAN,
    group_id            VARCHAR(64),
    customer_advance_reconciled   NUMERIC(15,2) DEFAULT 0,
    customer_advance_pending      NUMERIC(15,2) DEFAULT 0,
    customer_outstanding_amount   NUMERIC(15,2) DEFAULT 0,
    CONSTRAINT fk_trips_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_trips_driver FOREIGN KEY (driver_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_trips_status CHECK (status IN ('CHO_XAC_NHAN','DA_XAC_NHAN','DA_GHEP_CHUYEN','DA_PHAN_XE','DANG_DON','DANG_DI','HOAN_THANH','DA_HUY'))
);

CREATE TABLE trip_groups (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    trip_ids            VARCHAR(1000),
    vehicle_id          BIGINT,
    vehicle_name        VARCHAR(255),
    driver_id           BIGINT,
    driver_name         VARCHAR(255),
    status              VARCHAR(20) NOT NULL,
    created_at          TIMESTAMP NOT NULL,
    total_passengers    INTEGER,
    total_revenue       DOUBLE PRECISION,
    CONSTRAINT chk_trip_groups_status CHECK (status IN ('DANG_GHEP','DA_PHAN_XE','DANG_CHAY','HOAN_THANH')),
    CONSTRAINT fk_trip_groups_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_trip_groups_driver FOREIGN KEY (driver_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE trip_payments (
    id                  BIGSERIAL PRIMARY KEY,
    trip_id             BIGINT,
    driver_id           BIGINT,
    amount              DOUBLE PRECISION NOT NULL,
    method              VARCHAR(10) NOT NULL,
    collected_at        TIMESTAMP,
    CONSTRAINT chk_trip_payments_method CHECK (method IN ('CASH','TRANSFER')),
    CONSTRAINT fk_trip_payments_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_trip_payments_driver FOREIGN KEY (driver_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE deposit_records (
    id                  BIGSERIAL PRIMARY KEY,
    driver_id           BIGINT,
    amount              DOUBLE PRECISION NOT NULL,
    created_at          TIMESTAMP,
    note                VARCHAR(1000),
    CONSTRAINT fk_deposit_records_driver FOREIGN KEY (driver_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE customer_advance_payments (
    id                  BIGSERIAL PRIMARY KEY,
    trip_id             BIGINT,
    customer_name       VARCHAR(255) NOT NULL,
    customer_phone      VARCHAR(32) NOT NULL,
    amount              DOUBLE PRECISION NOT NULL,
    method              VARCHAR(10) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    collected_by        BIGINT,
    collected_at        TIMESTAMP NOT NULL,
    submitted_by        BIGINT,
    submitted_at        TIMESTAMP,
    reconciled_by       BIGINT,
    reconciled_at       TIMESTAMP,
    receipt_code        VARCHAR(64),
    note                VARCHAR(2000),
    CONSTRAINT chk_customer_adv_method CHECK (method IN ('CASH','TRANSFER')),
    CONSTRAINT chk_customer_adv_status CHECK (status IN ('PENDING','SUBMITTED','RECONCILED','REJECTED')),
    CONSTRAINT fk_customer_adv_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_customer_adv_collector FOREIGN KEY (collected_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_customer_adv_submitter FOREIGN KEY (submitted_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_customer_adv_reconciler FOREIGN KEY (reconciled_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE driver_expense_advances (
    id                  BIGSERIAL PRIMARY KEY,
    driver_id           BIGINT NOT NULL,
    trip_id             BIGINT,
    amount              DOUBLE PRECISION NOT NULL,
    expense_type        VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    requested_by        BIGINT,
    requested_at        TIMESTAMP NOT NULL,
    approved_by         BIGINT,
    approved_at         TIMESTAMP,
    deducted_by         BIGINT,
    deducted_at         TIMESTAMP,
    rejection_reason    VARCHAR(2000),
    note                VARCHAR(2000),
    CONSTRAINT chk_driver_adv_type CHECK (expense_type IN ('TOLL','PARKING','FUEL','OTHER')),
    CONSTRAINT chk_driver_adv_status CHECK (status IN ('REQUESTED','APPROVED','DEDUCTED','REJECTED')),
    CONSTRAINT fk_driver_adv_driver FOREIGN KEY (driver_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_driver_adv_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_driver_adv_requested_by FOREIGN KEY (requested_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_driver_adv_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_driver_adv_deducted_by FOREIGN KEY (deducted_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE auth_tokens (
    id                  BIGSERIAL PRIMARY KEY,
    token               VARCHAR(512) NOT NULL UNIQUE,
    user_id             BIGINT NOT NULL,
    created_at          TIMESTAMP NOT NULL,
    expires_at          TIMESTAMP NOT NULL,
    CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Helpful indexes for frequent lookups
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_driver_status ON users (driver_status);
CREATE INDEX idx_trips_driver_status ON trips (driver_id, status);
CREATE INDEX idx_trips_pickup_time ON trips (pickup_time);
CREATE INDEX idx_trip_payments_trip ON trip_payments (trip_id);
CREATE INDEX idx_customer_adv_trip ON customer_advance_payments (trip_id);
CREATE INDEX idx_driver_expense_driver ON driver_expense_advances (driver_id, status);
CREATE INDEX idx_deposit_records_driver ON deposit_records (driver_id);
