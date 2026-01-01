-- Update Credits Schema - Make accountantName optional and set defaults
-- This migration updates existing credits system

BEGIN;

-- Make accountantName nullable
ALTER TABLE "credits" ALTER COLUMN "accountantName" DROP NOT NULL;

-- Update existing records with null accountantName to have a default value
UPDATE "credits" 
SET "accountantName" = 'Company Accountant' 
WHERE "accountantName" IS NULL OR "accountantName" = '';

-- Update all existing PENDING records to CONFIRMED (since we're removing status management)
UPDATE "credits" 
SET "status" = 'CONFIRMED' 
WHERE "status" = 'PENDING';

COMMIT;

-- Verification
SELECT 'Schema updated successfully' as status;
SELECT COUNT(*) as total_credits, 
       COUNT(CASE WHEN "accountantName" IS NOT NULL THEN 1 END) as credits_with_accountant,
       COUNT(CASE WHEN "status" = 'CONFIRMED' THEN 1 END) as confirmed_credits
FROM "credits";