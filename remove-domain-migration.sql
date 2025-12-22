-- Migration to remove domain column from tenants table
-- Run this SQL against your database

-- First, make name column unique since we're removing domain
ALTER TABLE tenants ADD CONSTRAINT tenants_name_unique UNIQUE (name);

-- Drop the domain column
ALTER TABLE tenants DROP COLUMN domain;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
ORDER BY ordinal_position;