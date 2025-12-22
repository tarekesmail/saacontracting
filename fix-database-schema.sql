-- Manual database migration to fix schema issues
-- Run this against your saa_contracting database

BEGIN;

-- Add dual pricing columns to laborers
ALTER TABLE laborers ADD COLUMN IF NOT EXISTS "salaryRate" DECIMAL(10,2);
ALTER TABLE laborers ADD COLUMN IF NOT EXISTS "orgRate" DECIMAL(10,2);

-- Migrate existing hourlyRate to salaryRate (if exists)
UPDATE laborers SET "salaryRate" = "hourlyRate" WHERE "hourlyRate" IS NOT NULL AND "salaryRate" IS NULL;

-- Set orgRate to be 40% higher than salaryRate (example markup)
UPDATE laborers SET "orgRate" = "salaryRate" * 1.4 WHERE "salaryRate" IS NOT NULL AND "orgRate" IS NULL;

-- Set default rates for any laborers without rates
UPDATE laborers SET "salaryRate" = 20.00 WHERE "salaryRate" IS NULL;
UPDATE laborers SET "orgRate" = 28.00 WHERE "orgRate" IS NULL;

-- Make both rate columns NOT NULL
ALTER TABLE laborers ALTER COLUMN "salaryRate" SET NOT NULL;
ALTER TABLE laborers ALTER COLUMN "orgRate" SET NOT NULL;

-- Add tenantId to jobs if not exists
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Update jobs to have tenantId (set to first tenant if exists)
UPDATE jobs SET "tenantId" = (SELECT id FROM tenants LIMIT 1) WHERE "tenantId" IS NULL;

-- Make tenantId NOT NULL if we have tenants
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
        ALTER TABLE jobs ALTER COLUMN "tenantId" SET NOT NULL;
        
        -- Add foreign key constraint
        ALTER TABLE jobs ADD CONSTRAINT jobs_tenantId_fkey 
        FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Remove old columns if they exist
ALTER TABLE laborers DROP COLUMN IF EXISTS "hourlyRate";
ALTER TABLE laborers DROP COLUMN IF EXISTS email;
ALTER TABLE laborers DROP COLUMN IF EXISTS "groupId";

-- Update jobs table
ALTER TABLE jobs DROP COLUMN IF EXISTS "pricePerHour";
ALTER TABLE jobs DROP COLUMN IF EXISTS "groupId";

-- Drop labor_groups table if exists
DROP TABLE IF EXISTS labor_groups CASCADE;

-- Add unique constraint for jobs (tenantId + name)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_groupId_name_key;
ALTER TABLE jobs ADD CONSTRAINT IF NOT EXISTS jobs_tenantId_name_key UNIQUE ("tenantId", name);

COMMIT;