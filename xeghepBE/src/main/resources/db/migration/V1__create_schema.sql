-- Create user table for authentication
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'DISPATCHER', 'CALL_CENTER', 'DRIVER')),
    email VARCHAR(255),
    phone VARCHAR(32),
    avatar VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create customer table
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(256),
    phone VARCHAR(32),
    address VARCHAR(500),
    join_date TIMESTAMP,
    total_trips INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0.0,
    rating DECIMAL(3,2) DEFAULT 5.0,
    avatar VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'HOAT_DONG' CHECK (status IN ('HOAT_DONG', 'NGUNG_HOAT_DONG')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicle table
CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    model VARCHAR(255),
    year INTEGER,
    license_plate VARCHAR(32) NOT NULL UNIQUE,
    color VARCHAR(255),
    seats INTEGER NOT NULL,
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('XANG', 'DAU', 'DIEN', 'HYBRID')),
    status VARCHAR(20) NOT NULL DEFAULT 'SAN_SANG' CHECK (status IN ('SAN_SANG', 'DANG_CHAY', 'BAO_TRI', 'NGUNG_HOAT_DONG')),
    mileage INTEGER,
    last_maintenance TIMESTAMP,
    next_maintenance TIMESTAMP,
    image VARCHAR(500),
    total_trips INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create driver table
CREATE TABLE drivers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    email VARCHAR(255),
    license_number VARCHAR(64),
    license_expiry TIMESTAMP,
    address VARCHAR(500),
    date_of_birth TIMESTAMP,
    join_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'HOAT_DONG' CHECK (status IN ('HOAT_DONG', 'NGHI_PHEP', 'NGUNG_HOAT_DONG')),
    avatar VARCHAR(500),
    vehicle_id BIGINT REFERENCES vehicles(id),
    total_trips INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.0,
    total_earnings DECIMAL(12,2) DEFAULT 0.0,
    outstanding_balance DECIMAL(12,2) DEFAULT 0.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create trip table
CREATE TABLE trips (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT REFERENCES vehicles(id),
    vehicle_name VARCHAR(255),
    driver_id BIGINT REFERENCES drivers(id),
    driver_name VARCHAR(255),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    pickup_location VARCHAR(500) NOT NULL,
    dropoff_location VARCHAR(500) NOT NULL,
    pickup_time TIMESTAMP NOT NULL,
    dropoff_time TIMESTAMP,
    distance INTEGER,
    price DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CHO_XAC_NHAN' CHECK (status IN ('CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DA_GHEP_CHUYEN', 'DA_PHAN_XE', 'DANG_DON', 'DANG_DI', 'HOAN_THANH', 'DA_HUY')),
    passengers INTEGER NOT NULL,
    notes TEXT,
    rating INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    pickup_confirmed BOOLEAN DEFAULT FALSE,
    dropoff_confirmed BOOLEAN DEFAULT FALSE,
    group_id VARCHAR(64)
);

-- Create trip groups table
CREATE TABLE trip_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trip_ids VARCHAR(1000),
    vehicle_id BIGINT REFERENCES vehicles(id),
    vehicle_name VARCHAR(255),
    driver_id BIGINT REFERENCES drivers(id),
    driver_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'DANG_GHEP' CHECK (status IN ('DANG_GHEP', 'DA_PHAN_XE', 'DANG_CHAY', 'HOAN_THANH')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_passengers INTEGER,
    total_revenue DECIMAL(12,2)
);

-- Create payment tables
CREATE TABLE trip_payments (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT REFERENCES trips(id),
    driver_id BIGINT REFERENCES drivers(id),
    amount DECIMAL(12,2) NOT NULL,
    method VARCHAR(10) NOT NULL CHECK (method IN ('CASH', 'TRANSFER')),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deposit_records (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT REFERENCES drivers(id),
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

CREATE TABLE auth_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(512) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Create indices
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_status ON customers(status);

CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_status ON vehicles(status);

CREATE INDEX idx_drivers_name ON drivers(name);
CREATE INDEX idx_drivers_status ON drivers(status);

CREATE INDEX idx_trips_customer_id ON trips(customer_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_pickup_time ON trips(pickup_time);

CREATE INDEX idx_trip_groups_status ON trip_groups(status);
CREATE INDEX idx_trip_groups_created_at ON trip_groups(created_at);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);
