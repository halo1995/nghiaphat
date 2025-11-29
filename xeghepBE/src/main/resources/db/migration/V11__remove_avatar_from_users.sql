-- Remove avatar column from users table
-- This field is not needed in the application

ALTER TABLE users DROP COLUMN IF EXISTS avatar;
