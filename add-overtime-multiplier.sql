-- Add overtime multiplier column to timesheets table

-- Add the overtime multiplier column
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS "overtimeMultiplier" DECIMAL(3,1) DEFAULT 1.5;

-- Update existing records to have the default multiplier
UPDATE timesheets SET "overtimeMultiplier" = 1.5 WHERE "overtimeMultiplier" IS NULL;

-- Make the column NOT NULL
ALTER TABLE timesheets ALTER COLUMN "overtimeMultiplier" SET NOT NULL;

-- Show updated table structure
\d timesheets;