-- Add pickup_date column to trip_groups table
-- This column stores the earliest pickup date from all trips in the group
-- to optimize date filtering queries

ALTER TABLE trip_groups ADD COLUMN pickup_date DATE;

-- Note: Existing records will have NULL pickup_date initially.
-- The application will populate this field automatically when:
-- 1. Creating new trip groups
-- 2. Updating existing trip groups
-- 3. Adding/removing trips from groups
