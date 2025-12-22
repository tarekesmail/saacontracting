-- Complete data migration for SAA Contracting
-- This handles data integrity issues during the migration

-- Step 1: Add missing columns first
ALTER TABLE laborers ADD COLUMN IF NOT EXISTS "salaryRate" DECIMAL(10,2);
ALTER TABLE laborers ADD COLUMN IF NOT EXISTS "orgRate" DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Step 2: Set default values for new columns
UPDATE laborers SET "salaryRate" = 20.00 WHERE "salaryRate" IS NULL;
UPDATE laborers SET "orgRate" = 28.00 WHERE "orgRate" IS NULL;

-- Step 3: Handle jobs tenantId - get from their groups first
UPDATE jobs 
SET "tenantId" = (
    SELECT lg."tenantId" 
    FROM labor_groups lg 
    WHERE lg.id = jobs."groupId"
) 
WHERE "tenantId" IS NULL AND "groupId" IS NOT NULL;

-- If any jobs still don't have tenantId, set to first available tenant
UPDATE jobs 
SET "tenantId" = (SELECT id FROM tenants LIMIT 1) 
WHERE "tenantId" IS NULL;

-- Step 4: Handle laborers jobId - migrate from groupId to jobId
-- First, create jobs for each group if they don't exist
INSERT INTO jobs (id, name, "tenantId", "isActive", "createdAt", "updatedAt")
SELECT 
    'job_' || lg.id,
    lg.name || ' Job',
    lg."tenantId",
    true,
    NOW(),
    NOW()
FROM labor_groups lg
WHERE NOT EXISTS (
    SELECT 1 FROM jobs j 
    WHERE j."groupId" = lg.id
);

-- Now assign laborers to jobs based on their groupId
UPDATE laborers 
SET "jobId" = (
    SELECT j.id 
    FROM jobs j 
    WHERE j."groupId" = laborers."groupId"
    LIMIT 1
)
WHERE "jobId" IS NULL AND "groupId" IS NOT NULL;

-- For laborers without groupId, assign them to the first available job in their tenant
UPDATE laborers 
SET "jobId" = (
    SELECT j.id 
    FROM jobs j 
    WHERE j."tenantId" = laborers."tenantId"
    LIMIT 1
)
WHERE "jobId" IS NULL;

-- If still no job, create a default job for the tenant
INSERT INTO jobs (id, name, "tenantId", "isActive", "createdAt", "updatedAt")
SELECT 
    'default_job_' || t.id,
    'General Labor',
    t.id,
    true,
    NOW(),
    NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM jobs j WHERE j."tenantId" = t.id
);

-- Assign remaining laborers to default jobs
UPDATE laborers 
SET "jobId" = (
    SELECT j.id 
    FROM jobs j 
    WHERE j."tenantId" = laborers."tenantId" 
    AND j.name = 'General Labor'
    LIMIT 1
)
WHERE "jobId" IS NULL;

-- Step 5: Make columns NOT NULL now that they have values
ALTER TABLE laborers ALTER COLUMN "salaryRate" SET NOT NULL;
ALTER TABLE laborers ALTER COLUMN "orgRate" SET NOT NULL;
ALTER TABLE laborers ALTER COLUMN "jobId" SET NOT NULL;
ALTER TABLE jobs ALTER COLUMN "tenantId" SET NOT NULL;

-- Step 6: Add foreign key constraints
ALTER TABLE jobs ADD CONSTRAINT jobs_tenantId_fkey 
FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;

-- Step 7: Remove old columns
ALTER TABLE laborers DROP COLUMN IF EXISTS email;
ALTER TABLE laborers DROP COLUMN IF EXISTS "groupId";
ALTER TABLE jobs DROP COLUMN IF EXISTS "pricePerHour";
ALTER TABLE jobs DROP COLUMN IF EXISTS "groupId";

-- Step 8: Drop old constraints and table
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_groupId_name_key;
DROP TABLE IF EXISTS labor_groups CASCADE;

-- Step 9: Add new unique constraint
ALTER TABLE jobs ADD CONSTRAINT jobs_tenantId_name_key UNIQUE ("tenantId", name);

-- Show final counts
SELECT 'Tenants' as table_name, COUNT(*) as count FROM tenants
UNION ALL
SELECT 'Jobs' as table_name, COUNT(*) as count FROM jobs
UNION ALL
SELECT 'Laborers' as table_name, COUNT(*) as count FROM laborers;