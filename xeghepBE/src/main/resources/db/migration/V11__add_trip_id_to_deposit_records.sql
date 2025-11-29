-- Add trip_id column to deposit_records table for auto-allocation tracking
ALTER TABLE deposit_records ADD COLUMN trip_id BIGINT NULL;

-- Add index for better query performance
CREATE INDEX idx_deposit_records_trip_id ON deposit_records(trip_id);

-- Add comment
COMMENT ON COLUMN deposit_records.trip_id IS 'Optional: Links deposit to specific trip when using auto-allocation';
