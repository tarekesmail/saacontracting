-- Migration to add dual pricing: salary rate and organization rate
-- Run this SQL against your database

-- Step 1: Add salaryRate and orgRate columns to laborers table
ALTER TABLE laborers ADD COLUMN "salaryRate" DECIMAL(10,2);
ALTER TABLE laborers ADD COLUMN "orgRate" DECIMAL(10,2);

-- Step 2: Migrate existing hourlyRate to salaryRate (assuming current rate is salary)
UPDATE laborers SET "salaryRate" = "hourlyRate" WHERE "hourlyRate" IS NOT NULL;

-- Step 3: Set orgRate to be 40% higher than salaryRate (example markup)
-- You can adjust this percentage based on your business model
UPDATE laborers SET "orgRate" = "salaryRate" * 1.4 WHERE "salaryRate" IS NOT NULL;

-- Step 4: Set default rates for any laborers without rates (safety)
UPDATE laborers SET "salaryRate" = 20.00 WHERE "salaryRate" IS NULL;
UPDATE laborers SET "orgRate" = 28.00 WHERE "orgRate" IS NULL;

-- Step 5: Make both rate columns NOT NULL
ALTER TABLE laborers ALTER COLUMN "salaryRate" SET NOT NULL;
ALTER TABLE laborers ALTER COLUMN "orgRate" SET NOT NULL;

-- Step 6: Remove the old hourlyRate column
ALTER TABLE laborers DROP COLUMN "hourlyRate";

-- Verify the changes
SELECT 'Laborers table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'laborers' 
ORDER BY ordinal_position;

-- Show sample data with both rates
SELECT 'Sample laborers with dual rates:' as info;
SELECT name, "idNumber", "salaryRate", "orgRate", 
       ("orgRate" - "salaryRate") as profit_margin,
       ROUND((("orgRate" - "salaryRate") / "salaryRate" * 100), 2) as markup_percentage
FROM laborers LIMIT 5;