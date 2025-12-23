-- Migration: Make overtime multiplier nullable
-- This allows overtime multiplier to be null when there are no overtime hours

-- Remove the default value and make the column nullable
ALTER TABLE timesheets 
ALTER COLUMN "overtimeMultiplier" DROP DEFAULT,
ALTER COLUMN "overtimeMultiplier" DROP NOT NULL;

-- Update existing records where overtime is 0 to have null overtime multiplier
UPDATE timesheets 
SET "overtimeMultiplier" = NULL 
WHERE overtime = 0;

-- Verification query
SELECT 
    COUNT(*) as total_records,
    COUNT("overtimeMultiplier") as records_with_multiplier,
    COUNT(*) - COUNT("overtimeMultiplier") as records_with_null_multiplier,
    COUNT(CASE WHEN overtime > 0 THEN 1 END) as records_with_overtime,
    COUNT(CASE WHEN overtime = 0 THEN 1 END) as records_without_overtime
FROM timesheets;

SELECT 'Migration completed successfully' as status;