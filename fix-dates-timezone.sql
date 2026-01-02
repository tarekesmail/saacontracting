-- Fix timezone issues by normalizing all dates to noon UTC
-- This ensures dates don't shift when crossing timezone boundaries

-- Fix Expense dates
UPDATE expenses
SET date = DATE_TRUNC('day', date) + INTERVAL '12 hours';

-- Fix Timesheet dates
UPDATE timesheets
SET date = DATE_TRUNC('day', date) + INTERVAL '12 hours';

-- Fix Credit dates
UPDATE credits
SET date = DATE_TRUNC('day', date) + INTERVAL '12 hours';

-- Fix Supply dates
UPDATE supplies
SET date = DATE_TRUNC('day', date) + INTERVAL '12 hours';

-- Verify the changes
SELECT 'expenses' as table_name, COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date FROM expenses
UNION ALL
SELECT 'timesheets', COUNT(*), MIN(date), MAX(date) FROM timesheets
UNION ALL
SELECT 'credits', COUNT(*), MIN(date), MAX(date) FROM credits
UNION ALL
SELECT 'supplies', COUNT(*), MIN(date), MAX(date) FROM supplies;
