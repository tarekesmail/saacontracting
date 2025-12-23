-- Bulk Insert Laborers from CSV
-- Replace the VALUES with your actual CSV data
-- 
-- CSV Format expected: name, idNumber, phoneNumber, salaryRate, orgRate, jobName
-- 
-- Available Tenants:
-- Hafar Al Batin: cmjhk9737000011tvsh4uxnmg
-- Mecca: cmjhk9thx000111tvm30qti6g
--
-- Available Jobs for Hafar Al Batin:
-- Flagman: cmjip9qzs002r16nbw14uc3is
-- Labour: cmjipa90g002t16nb42q6kwih

-- Function to generate CUID-like IDs (simplified version)
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
BEGIN
    RETURN 'cm' || substr(md5(random()::text || clock_timestamp()::text), 1, 23);
END;
$$ LANGUAGE plpgsql;

-- Bulk insert laborers
-- Modify the VALUES section with your CSV data
INSERT INTO laborers (
    id,
    name,
    "idNumber",
    "phoneNumber", 
    "startDate",
    "salaryRate",
    "orgRate",
    "tenantId",
    "jobId",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES 
-- Example rows - replace with your CSV data
-- Format: (generate_cuid(), 'Name', 'ID Number', 'Phone', '2025-12-01', salary_rate, org_rate, tenant_id, job_id, true, NOW(), NOW())

-- For Hafar Al Batin tenant with Flagman job:
(generate_cuid(), 'Ahmed Ali', '1234567890', '+966501234567', '2025-12-01', 25.00, 35.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),

-- For Hafar Al Batin tenant with Labour job:
(generate_cuid(), 'Mohammed Hassan', '1234567891', '+966501234568', '2025-12-01', 20.00, 30.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),

-- Add more rows here following the same pattern
-- (generate_cuid(), 'Worker Name', 'ID Number', 'Phone Number', '2025-12-01', salary_rate, org_rate, 'cmjhk9737000011tvsh4uxnmg', 'job_id', true, NOW(), NOW()),

-- Example for Mecca tenant (if needed):
-- (generate_cuid(), 'Worker Name', 'ID Number', 'Phone Number', '2025-12-01', salary_rate, org_rate, 'cmjhk9thx000111tvm30qti6g', 'job_id', true, NOW(), NOW()),

-- Remove the comma from the last row
(generate_cuid(), 'Last Worker Name', '1234567999', '+966501234999', '2025-12-01', 22.00, 32.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW());

-- Clean up the function after use
DROP FUNCTION generate_cuid();

-- Verify the insert
SELECT COUNT(*) as total_laborers FROM laborers;
SELECT name, "idNumber", "phoneNumber", "startDate", "salaryRate", "orgRate" FROM laborers ORDER BY "createdAt" DESC LIMIT 10;