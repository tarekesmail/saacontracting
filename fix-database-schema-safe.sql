-- Safe database migration to fix schema issues
-- This script handles cases where columns may or may not exist

-- First, let's check what we're working with
\d laborers;
\d jobs;

-- Add dual pricing columns to laborers (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laborers' AND column_name = 'salaryRate') THEN
        ALTER TABLE laborers ADD COLUMN "salaryRate" DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laborers' AND column_name = 'orgRate') THEN
        ALTER TABLE laborers ADD COLUMN "orgRate" DECIMAL(10,2);
    END IF;
END $$;

-- Set default rates for laborers that don't have them
UPDATE laborers SET "salaryRate" = 20.00 WHERE "salaryRate" IS NULL;
UPDATE laborers SET "orgRate" = 28.00 WHERE "orgRate" IS NULL;

-- Make rate columns NOT NULL (only if they exist and have values)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laborers' AND column_name = 'salaryRate') THEN
        ALTER TABLE laborers ALTER COLUMN "salaryRate" SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laborers' AND column_name = 'orgRate') THEN
        ALTER TABLE laborers ALTER COLUMN "orgRate" SET NOT NULL;
    END IF;
END $$;

-- Add tenantId to jobs if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'tenantId') THEN
        ALTER TABLE jobs ADD COLUMN "tenantId" TEXT;
    END IF;
END $$;

-- Update jobs to have tenantId (set to first tenant if exists)
UPDATE jobs SET "tenantId" = (SELECT id FROM tenants LIMIT 1) WHERE "tenantId" IS NULL;

-- Make tenantId NOT NULL and add foreign key if we have tenants
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tenants LIMIT 1) AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'tenantId') THEN
        -- Make tenantId NOT NULL
        ALTER TABLE jobs ALTER COLUMN "tenantId" SET NOT NULL;
        
        -- Add foreign key constraint (drop first if exists)
        BEGIN
            ALTER TABLE jobs DROP CONSTRAINT jobs_tenantId_fkey;
        EXCEPTION
            WHEN undefined_object THEN NULL;
        END;
        
        ALTER TABLE jobs ADD CONSTRAINT jobs_tenantId_fkey 
        FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Remove old columns if they exist
DO $$
BEGIN
    -- Remove hourlyRate from laborers if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laborers' AND column_name = 'hourlyRate') THEN
        ALTER TABLE laborers DROP COLUMN "hourlyRate";
    END IF;
    
    -- Remove email from laborers if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laborers' AND column_name = 'email') THEN
        ALTER TABLE laborers DROP COLUMN email;
    END IF;
    
    -- Remove groupId from laborers if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'laborers' AND column_name = 'groupId') THEN
        ALTER TABLE laborers DROP COLUMN "groupId";
    END IF;
    
    -- Remove pricePerHour from jobs if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'pricePerHour') THEN
        ALTER TABLE jobs DROP COLUMN "pricePerHour";
    END IF;
    
    -- Remove groupId from jobs if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'groupId') THEN
        ALTER TABLE jobs DROP COLUMN "groupId";
    END IF;
END $$;

-- Drop labor_groups table if exists
DROP TABLE IF EXISTS labor_groups CASCADE;

-- Handle unique constraints
DO $$
BEGIN
    -- Drop old constraint if it exists
    BEGIN
        ALTER TABLE jobs DROP CONSTRAINT jobs_groupId_name_key;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    -- Add new constraint if it doesn't exist
    BEGIN
        ALTER TABLE jobs ADD CONSTRAINT jobs_tenantId_name_key UNIQUE ("tenantId", name);
    EXCEPTION
        WHEN duplicate_table THEN NULL;
    END;
END $$;

-- Show final structure
\d laborers;
\d jobs;