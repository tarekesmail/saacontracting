-- Migration to remove groups and make jobs belong directly to tenants
-- Run this SQL against your database

-- Step 1: Add tenantId to jobs table
ALTER TABLE jobs ADD COLUMN "tenantId" TEXT;

-- Step 2: Update jobs to get tenantId from their groups
UPDATE jobs 
SET "tenantId" = labor_groups."tenantId" 
FROM labor_groups 
WHERE jobs."groupId" = labor_groups.id;

-- Step 3: Make tenantId NOT NULL
ALTER TABLE jobs ALTER COLUMN "tenantId" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE jobs ADD CONSTRAINT jobs_tenantId_fkey 
FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;

-- Step 5: Update unique constraint for jobs (remove groupId, add tenantId)
ALTER TABLE jobs DROP CONSTRAINT jobs_groupId_name_key;
ALTER TABLE jobs ADD CONSTRAINT jobs_tenantId_name_key UNIQUE ("tenantId", name);

-- Step 6: Make jobId required in laborers table
UPDATE laborers SET "jobId" = (
  SELECT j.id FROM jobs j 
  JOIN labor_groups lg ON j."groupId" = lg.id 
  WHERE lg.id = laborers."groupId" 
  LIMIT 1
) WHERE "jobId" IS NULL AND "groupId" IS NOT NULL;

-- Step 7: Remove laborers without jobs (if any)
DELETE FROM laborers WHERE "jobId" IS NULL;

-- Step 8: Make jobId NOT NULL
ALTER TABLE laborers ALTER COLUMN "jobId" SET NOT NULL;

-- Step 9: Drop group-related columns and constraints
ALTER TABLE laborers DROP CONSTRAINT IF EXISTS laborers_groupId_fkey;
ALTER TABLE laborers DROP COLUMN "groupId";

-- Step 10: Drop group-related columns from jobs
ALTER TABLE jobs DROP CONSTRAINT jobs_groupId_fkey;
ALTER TABLE jobs DROP COLUMN "groupId";

-- Step 11: Drop the labor_groups table
DROP TABLE labor_groups;

-- Verify the changes
SELECT 'Jobs table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;

SELECT 'Laborers table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'laborers' 
ORDER BY ordinal_position;