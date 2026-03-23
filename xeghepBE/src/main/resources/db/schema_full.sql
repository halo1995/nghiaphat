-- FULL DATABASE SCHEMA FOR NGHIAPHAT TRANSPORT SERVICE
-- Database: PostgreSQL

-- Drop existing tables if needed (uncomment if you want to reset)
-- DROP TABLE IF EXISTS trip_status_history CASCADE;
-- DROP TABLE IF EXISTS trip_payments CASCADE;
-- DROP TABLE IF EXISTS payment_attachments CASCADE;
-- DROP TABLE IF EXISTS expense_voucher_history CASCADE;
-- DROP TABLE IF EXISTS expense_vouchers CASCADE;
-- DROP TABLE IF EXISTS driver_transactions CASCADE;
-- DROP TABLE IF EXISTS driver_expense_advances CASCADE;
-- DROP TABLE IF EXISTS deposit_records CASCADE;
-- DROP TABLE IF EXISTS customer_advance_payments CASCADE;
-- DROP TABLE IF EXISTS company_transactions CASCADE;
-- DROP TABLE IF EXISTS company_wallets CASCADE;
-- DROP TABLE IF EXISTS auth_tokens CASCADE;
-- DROP TABLE IF EXISTS trip_groups CASCADE;
-- DROP TABLE IF EXISTS trips CASCADE;
-- DROP TABLE IF EXISTS vehicles CASCADE;
-- DROP TABLE IF EXISTS customers CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- 1. Users table (Admins, Dispatchers, Drivers, etc.)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(32),
    license_number VARCHAR(64),
    license_expiry TIMESTAMP,
    address VARCHAR(500),
    date_of_birth TIMESTAMP,
    join_date TIMESTAMP,
    driver_status VARCHAR(20),
    vehicle_id BIGINT,
    total_trips INTEGER DEFAULT 0,
    rating DOUBLE PRECISION DEFAULT 5.0,
    total_earnings DOUBLE PRECISION DEFAULT 0.0,
    outstanding_balance DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- 2. Customers table
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(64),
    phone VARCHAR(32),
    address VARCHAR(500),
    join_date TIMESTAMP,
    total_trips INTEGER DEFAULT 0,
    total_spent DOUBLE PRECISION DEFAULT 0.0,
    rating DOUBLE PRECISION DEFAULT 5.0,
    avatar VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'HOAT_DONG',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 3. Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    model VARCHAR(255),
    year INTEGER,
    license_plate VARCHAR(32) UNIQUE NOT NULL,
    color VARCHAR(255),
    seats INTEGER NOT NULL,
    fuel_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    mileage INTEGER,
    last_maintenance TIMESTAMP,
    next_maintenance TIMESTAMP,
    image VARCHAR(500),
    total_trips INTEGER DEFAULT 0,
    rating DOUBLE PRECISION DEFAULT 5.0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 4. Trips table (Individual ride requests)
CREATE TABLE IF NOT EXISTS trips (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT,
    vehicle_name VARCHAR(255),
    driver_id BIGINT,
    driver_name VARCHAR(255),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    pickup_location VARCHAR(500) NOT NULL,
    pickup_province_code VARCHAR(16) NOT NULL,
    pickup_ward_code VARCHAR(16) NOT NULL,
    dropoff_location VARCHAR(500) NOT NULL,
    dropoff_province_code VARCHAR(16) NOT NULL,
    dropoff_ward_code VARCHAR(16) NOT NULL,
    pickup_time TIMESTAMP NOT NULL,
    dropoff_time TIMESTAMP,
    distance INTEGER,
    price DECIMAL(19,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    passengers INTEGER NOT NULL,
    notes VARCHAR(1000),
    rating INTEGER,
    created_at TIMESTAMP NOT NULL,
    full_vehicle BOOLEAN DEFAULT FALSE NOT NULL,
    confirmed_at TIMESTAMP,
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    pickup_confirmed BOOLEAN DEFAULT FALSE,
    dropoff_confirmed BOOLEAN DEFAULT FALSE,
    group_id VARCHAR(64)
);

-- 5. Trip Groups table (Aggregated trips for a vehicle/driver)
CREATE TABLE IF NOT EXISTS trip_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trip_ids VARCHAR(1000),
    vehicle_id BIGINT,
    vehicle_name VARCHAR(255),
    driver_id BIGINT,
    driver_name VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    total_passengers INTEGER,
    total_revenue DOUBLE PRECISION,
    pickup_date DATE
);

-- 6. Auth Tokens table
CREATE TABLE IF NOT EXISTS auth_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(512) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- 7. Company Wallets
CREATE TABLE IF NOT EXISTS company_wallets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    balance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency VARCHAR(16) NOT NULL DEFAULT 'VND',
    description TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- 8. Company Transactions
CREATE TABLE IF NOT EXISTS company_transactions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    description TEXT,
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL,
    balance_after DOUBLE PRECISION
);

-- 9. Customer Advance Payments
CREATE TABLE IF NOT EXISTS customer_advance_payments (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    method VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL,
    collected_by BIGINT,
    collected_at TIMESTAMP NOT NULL,
    submitted_by BIGINT,
    submitted_at TIMESTAMP,
    reconciled_by BIGINT,
    reconciled_at TIMESTAMP,
    receipt_code VARCHAR(64),
    note VARCHAR(2000)
);

-- 10. Deposit Records (Driver deposits to company)
CREATE TABLE IF NOT EXISTS deposit_records (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT,
    trip_id BIGINT,
    amount DOUBLE PRECISION NOT NULL,
    payment_method VARCHAR(20),
    created_at TIMESTAMP,
    note VARCHAR(1000)
);

-- 11. Driver Expense Advances (Company advances to driver)
CREATE TABLE IF NOT EXISTS driver_expense_advances (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL,
    trip_id BIGINT,
    amount DOUBLE PRECISION NOT NULL,
    expense_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    requested_by BIGINT,
    requested_at TIMESTAMP NOT NULL,
    approved_by BIGINT,
    approved_at TIMESTAMP,
    transferred_by BIGINT,
    transferred_at TIMESTAMP,
    deducted_by BIGINT,
    deducted_at TIMESTAMP,
    rejection_reason VARCHAR(2000),
    note VARCHAR(2000)
);

-- 12. Driver Transactions (Account balance tracking)
CREATE TABLE IF NOT EXISTS driver_transactions (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    description TEXT,
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL,
    balance_after DOUBLE PRECISION
);

-- 13. Expense Vouchers (Company expenses)
CREATE TABLE IF NOT EXISTS expense_vouchers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    payee_name VARCHAR(255) NOT NULL,
    payee_account VARCHAR(255),
    description TEXT,
    note TEXT,
    status VARCHAR(20) NOT NULL,
    wallet_id BIGINT NOT NULL,
    driver_expense_advance_id BIGINT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    submitted_by BIGINT,
    submitted_at TIMESTAMP,
    approved_by BIGINT,
    approved_at TIMESTAMP,
    rejected_by BIGINT,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    paid_by BIGINT,
    paid_at TIMESTAMP
);

-- 14. Expense Voucher History
CREATE TABLE IF NOT EXISTS expense_voucher_history (
    id BIGSERIAL PRIMARY KEY,
    voucher_id BIGINT NOT NULL,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    note TEXT,
    action_by BIGINT,
    action_at TIMESTAMP NOT NULL
);

-- 15. Payment Attachments (Receipts, images)
CREATE TABLE IF NOT EXISTS payment_attachments (
    id BIGSERIAL PRIMARY KEY,
    reference_type VARCHAR(32) NOT NULL,
    reference_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    content_type VARCHAR(128),
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(128),
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- 16. Trip Payments
CREATE TABLE IF NOT EXISTS trip_payments (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT,
    driver_id BIGINT,
    amount DOUBLE PRECISION NOT NULL,
    method VARCHAR(10) NOT NULL,
    collected_at TIMESTAMP
);

-- 17. Trip Status History
CREATE TABLE IF NOT EXISTS trip_status_history (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    action_at TIMESTAMP NOT NULL,
    action_by VARCHAR(50),
    action_by_name VARCHAR(255),
    note VARCHAR(1000)
);
