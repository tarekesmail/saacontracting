-- Manual Laborers Bulk Insert Template
-- Replace the example data with your CSV data
-- Start Date: 2025-12-01 (1/12/2025)
-- Tenant: Hafar Al Batin (cmjhk9737000011tvsh4uxnmg)

-- Function to generate CUID-like IDs
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
BEGIN
    RETURN 'cm' || substr(md5(random()::text || clock_timestamp()::text), 1, 23);
END;
$$ LANGUAGE plpgsql;

-- Bulk insert laborers
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

-- REPLACE THE FOLLOWING ROWS WITH YOUR CSV DATA
-- Format: (generate_cuid(), 'Name', 'ID_Number', 'Phone', '2025-12-01', salary_rate, org_rate, tenant_id, job_id, true, NOW(), NOW())

-- Example for Flagman job (cmjip9qzs002r16nbw14uc3is):
(generate_cuid(), 'Ahmed Ali Mohammed', '1234567890', '+966501234567', '2025-12-01', 25.00, 35.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),

-- Example for Labour job (cmjipa90g002t16nb42q6kwih):
(generate_cuid(), 'Mohammed Hassan Ali', '1234567891', '+966501234568', '2025-12-01', 20.00, 30.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),

-- Add more rows here - copy the pattern above
-- For Flagman: use job ID 'cmjip9qzs002r16nbw14uc3is'
-- For Labour: use job ID 'cmjipa90g002t16nb42q6kwih'
-- Tenant ID (Hafar Al Batin): 'cmjhk9737000011tvsh4uxnmg'

-- TEMPLATE ROW (copy and modify):
-- (generate_cuid(), 'WORKER_NAME', 'ID_NUMBER', 'PHONE_NUMBER', '2025-12-01', SALARY_RATE, ORG_RATE, 'cmjhk9737000011tvsh4uxnmg', 'JOB_ID', true, NOW(), NOW()),

-- Last row (remove comma at the end):
(generate_cuid(), 'Last Worker Name', '9999999999', '+966509999999', '2025-12-01', 22.00, 32.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW());

-- Clean up the function
DROP FUNCTION generate_cuid();

-- Verify the results
SELECT COUNT(*) as "Total Laborers Added" FROM laborers WHERE "startDate" = '2025-12-01';

SELECT 
    l.name as "Laborer Name",
    l."idNumber" as "ID Number", 
    l."phoneNumber" as "Phone",
    l."salaryRate" as "Salary Rate (SAR/hr)",
    l."orgRate" as "Org Rate (SAR/hr)",
    j.name as "Job",
    t.name as "Tenant"
FROM laborers l
JOIN jobs j ON l."jobId" = j.id
JOIN tenants t ON l."tenantId" = t.id
WHERE l."startDate" = '2025-12-01'
ORDER BY l."createdAt" DESC;