-- Merge driver data into users table and drop drivers table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS license_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS license_expiry TIMESTAMP,
    ADD COLUMN IF NOT EXISTS address VARCHAR(500),
    ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMP,
    ADD COLUMN IF NOT EXISTS join_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS driver_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS vehicle_id BIGINT REFERENCES vehicles(id),
    ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION DEFAULT 5.0,
    ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(12,2) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(12,2) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

ALTER TABLE users
    ADD CONSTRAINT IF NOT EXISTS chk_users_driver_status
        CHECK (driver_status IS NULL OR driver_status IN ('HOAT_DONG', 'NGHI_PHEP', 'NGUNG_HOAT_DONG'));

ALTER TABLE users
    ALTER COLUMN total_trips SET DEFAULT 0,
    ALTER COLUMN rating SET DEFAULT 5.0,
    ALTER COLUMN total_earnings SET DEFAULT 0.0,
    ALTER COLUMN outstanding_balance SET DEFAULT 0.0,
    ALTER COLUMN driver_status SET DEFAULT 'HOAT_DONG';

UPDATE users
SET
    total_trips = COALESCE(total_trips, 0),
    rating = COALESCE(rating, 5.0),
    total_earnings = COALESCE(total_earnings, 0.0),
    outstanding_balance = COALESCE(outstanding_balance, 0.0),
    updated_at = COALESCE(updated_at, created_at, NOW());

-- Temporary mapping between legacy driver rows and user rows
CREATE TEMP TABLE driver_user_map (
    driver_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL
);

INSERT INTO driver_user_map (driver_id, user_id)
SELECT DISTINCT ON (d.id)
    d.id,
    u.id
FROM drivers d
JOIN users u
  ON (
        u.phone IS NOT NULL AND d.phone IS NOT NULL AND LOWER(u.phone) = LOWER(d.phone)
     ) OR (
        u.email IS NOT NULL AND d.email IS NOT NULL AND LOWER(u.email) = LOWER(d.email)
     )
ORDER BY d.id, u.id;

-- Insert missing user accounts for drivers that do not have a matching user
INSERT INTO users (
    username,
    password,
    name,
    role,
    email,
    phone,
    avatar,
    created_at,
    last_login,
    license_number,
    license_expiry,
    address,
    date_of_birth,
    join_date,
    driver_status,
    vehicle_id,
    total_trips,
    rating,
    total_earnings,
    outstanding_balance,
    updated_at
)
SELECT
    CONCAT('driver_', d.id) AS username,
    'driver123' AS password,
    COALESCE(d.name, CONCAT('Driver ', d.id)) AS name,
    'DRIVER' AS role,
    d.email,
    d.phone,
    d.avatar,
    COALESCE(d.created_at, NOW()),
    d.updated_at,
    d.license_number,
    d.license_expiry,
    d.address,
    d.date_of_birth,
    d.join_date,
    COALESCE(d.status, 'HOAT_DONG'),
    d.vehicle_id,
    COALESCE(d.total_trips, 0),
    COALESCE(d.rating, 5.0),
    COALESCE(d.total_earnings, 0.0),
    COALESCE(d.outstanding_balance, 0.0),
    COALESCE(d.updated_at, NOW())
FROM drivers d
LEFT JOIN driver_user_map m ON m.driver_id = d.id
WHERE m.driver_id IS NULL;

-- Refresh mapping table with newly created users
INSERT INTO driver_user_map (driver_id, user_id)
SELECT d.id, u.id
FROM drivers d
JOIN users u ON u.username = CONCAT('driver_', d.id)
LEFT JOIN driver_user_map m ON m.driver_id = d.id
WHERE m.driver_id IS NULL;

-- Update user records with legacy driver attributes
UPDATE users u
SET
    license_number = COALESCE(d.license_number, u.license_number),
    license_expiry = COALESCE(d.license_expiry, u.license_expiry),
    address = COALESCE(d.address, u.address),
    date_of_birth = COALESCE(d.date_of_birth, u.date_of_birth),
    join_date = COALESCE(d.join_date, u.join_date, u.created_at),
    driver_status = COALESCE(d.status, u.driver_status, 'HOAT_DONG'),
    avatar = COALESCE(d.avatar, u.avatar),
    vehicle_id = COALESCE(d.vehicle_id, u.vehicle_id),
    total_trips = COALESCE(d.total_trips, u.total_trips, 0),
    rating = COALESCE(d.rating, u.rating, 5.0),
    total_earnings = COALESCE(d.total_earnings, u.total_earnings, 0.0),
    outstanding_balance = COALESCE(d.outstanding_balance, u.outstanding_balance, 0.0),
    role = 'DRIVER'
FROM drivers d
JOIN driver_user_map m ON m.driver_id = d.id
WHERE u.id = m.user_id;

-- Update relational references from legacy driver IDs to user IDs
WITH mapping AS (
    SELECT driver_id, user_id FROM driver_user_map
)
UPDATE trips t
SET driver_id = m.user_id
FROM mapping m
WHERE t.driver_id = m.driver_id;

UPDATE trips t
SET driver_name = u.name
FROM users u
WHERE t.driver_id = u.id;

WITH mapping AS (
    SELECT driver_id, user_id FROM driver_user_map
)
UPDATE trip_groups tg
SET driver_id = m.user_id
FROM mapping m
WHERE tg.driver_id = m.driver_id;

UPDATE trip_groups tg
SET driver_name = u.name
FROM users u
WHERE tg.driver_id = u.id;

WITH mapping AS (
    SELECT driver_id, user_id FROM driver_user_map
)
UPDATE trip_payments tp
SET driver_id = m.user_id
FROM mapping m
WHERE tp.driver_id = m.driver_id;

WITH mapping AS (
    SELECT driver_id, user_id FROM driver_user_map
)
UPDATE deposit_records dr
SET driver_id = m.user_id
FROM mapping m
WHERE dr.driver_id = m.driver_id;

DROP TABLE driver_user_map;

-- Drop foreign keys referencing drivers table
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;
ALTER TABLE trip_groups DROP CONSTRAINT IF EXISTS trip_groups_driver_id_fkey;
ALTER TABLE trip_payments DROP CONSTRAINT IF EXISTS trip_payments_driver_id_fkey;
ALTER TABLE deposit_records DROP CONSTRAINT IF EXISTS deposit_records_driver_id_fkey;

-- Add new foreign keys pointing to users
ALTER TABLE trips
    ADD CONSTRAINT fk_trips_driver
        FOREIGN KEY (driver_id) REFERENCES users(id);

ALTER TABLE trip_groups
    ADD CONSTRAINT fk_trip_groups_driver
        FOREIGN KEY (driver_id) REFERENCES users(id);

ALTER TABLE trip_payments
    ADD CONSTRAINT fk_trip_payments_driver
        FOREIGN KEY (driver_id) REFERENCES users(id);

ALTER TABLE deposit_records
    ADD CONSTRAINT fk_deposit_records_driver
        FOREIGN KEY (driver_id) REFERENCES users(id);

-- Drop legacy driver indexes and table
DROP INDEX IF EXISTS idx_drivers_name;
DROP INDEX IF EXISTS idx_drivers_status;

DROP TABLE IF EXISTS drivers;
