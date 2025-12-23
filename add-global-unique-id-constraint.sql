-- Migration: Add global unique constraint for laborer ID numbers
-- This ensures no duplicate ID numbers can exist across the entire system

-- First, check for existing duplicates
SELECT 
    "idNumber", 
    COUNT(*) as count,
    STRING_AGG(name, ', ') as names
FROM laborers 
WHERE "isActive" = true
GROUP BY "idNumber" 
HAVING COUNT(*) > 1;

-- If there are duplicates, you'll need to resolve them manually before running the constraint
-- You can update duplicate ID numbers like this:
-- UPDATE laborers SET "idNumber" = "idNumber" || '_2' WHERE id = 'specific_duplicate_id';

-- Add the global unique constraint
-- Note: This will fail if there are existing duplicates
ALTER TABLE laborers 
ADD CONSTRAINT laborers_idNumber_unique UNIQUE ("idNumber");

-- Verification query
SELECT 
    COUNT(*) as total_laborers,
    COUNT(DISTINCT "idNumber") as unique_id_numbers
FROM laborers 
WHERE "isActive" = true;

SELECT 'Global unique constraint added successfully' as status;