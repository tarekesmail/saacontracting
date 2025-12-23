-- Complete Bulk Insert for Laborers
-- Start Date: 2025-12-01 (1/12/2025)
-- Tenant: Hafar Al Batin (cmjhk9737000011tvsh4uxnmg)
-- 
-- INSTRUCTIONS:
-- 1. Replace the sample data below with your actual CSV data
-- 2. Keep the same format for each row
-- 3. Use job IDs: Flagman (cmjip9qzs002r16nbw14uc3is), Labour (cmjipa90g002t16nb42q6kwih)
-- 4. Execute: docker exec -i saa-contracting-postgres psql -U postgres -d saa_contracting < complete-laborers-bulk-insert.sql

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

-- SAMPLE DATA - REPLACE WITH YOUR CSV DATA
-- Format: (generate_cuid(), 'Name', 'ID_Number', 'Phone', '2025-12-01', salary_rate, org_rate, tenant_id, job_id, true, NOW(), NOW())

-- Flagman Workers (Job ID: cmjip9qzs002r16nbw14uc3is)
(generate_cuid(), 'Ahmed Ali Mohammed', '1001234567', '+966501001001', '2025-12-01', 25.00, 35.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'Mohammed Hassan Ali', '1001234568', '+966501001002', '2025-12-01', 26.00, 36.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'Ali Abdullah Ahmed', '1001234569', '+966501001003', '2025-12-01', 24.00, 34.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'Hassan Mohammed Ali', '1001234570', '+966501001004', '2025-12-01', 25.50, 35.50, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'Abdullah Ahmed Hassan', '1001234571', '+966501001005', '2025-12-01', 27.00, 37.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),

-- Labour Workers (Job ID: cmjipa90g002t16nb42q6kwih)
(generate_cuid(), 'Omar Khalid Mohammed', '1001234572', '+966501002001', '2025-12-01', 20.00, 30.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Khalid Omar Ali', '1001234573', '+966501002002', '2025-12-01', 21.00, 31.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Saeed Ahmed Mohammed', '1001234574', '+966501002003', '2025-12-01', 19.50, 29.50, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Fahad Hassan Ali', '1001234575', '+966501002004', '2025-12-01', 22.00, 32.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Nasser Abdullah Ahmed', '1001234576', '+966501002005', '2025-12-01', 20.50, 30.50, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Turki Mohammed Hassan', '1001234577', '+966501002006', '2025-12-01', 21.50, 31.50, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Bandar Ali Ahmed', '1001234578', '+966501002007', '2025-12-01', 18.00, 28.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Majed Hassan Mohammed', '1001234579', '+966501002008', '2025-12-01', 23.00, 33.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Faisal Ahmed Ali', '1001234580', '+966501002009', '2025-12-01', 19.00, 29.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Saud Mohammed Abdullah', '1001234581', '+966501002010', '2025-12-01', 22.50, 32.50, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),

-- More Flagman Workers
(generate_cuid(), 'Rashed Ali Hassan', '1001234582', '+966501001006', '2025-12-01', 26.50, 36.50, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'Waleed Ahmed Mohammed', '1001234583', '+966501001007', '2025-12-01', 25.00, 35.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'Yazeed Hassan Ali', '1001234584', '+966501001008', '2025-12-01', 28.00, 38.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),

-- More Labour Workers
(generate_cuid(), 'Mansour Abdullah Hassan', '1001234585', '+966501002011', '2025-12-01', 20.00, 30.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Talal Mohammed Ali', '1001234586', '+966501002012', '2025-12-01', 21.00, 31.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Adel Hassan Ahmed', '1001234587', '+966501002013', '2025-12-01', 19.50, 29.50, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Badr Ali Mohammed', '1001234588', '+966501002014', '2025-12-01', 22.00, 32.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Nawaf Ahmed Hassan', '1001234589', '+966501002015', '2025-12-01', 20.50, 30.50, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'Sultan Mohammed Abdullah', '1001234590', '+966501002016', '2025-12-01', 23.50, 33.50, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),

-- ADD MORE ROWS HERE FOLLOWING THE SAME PATTERN
-- Copy this template and modify with your data:
-- (generate_cuid(), 'WORKER_NAME', 'ID_NUMBER', 'PHONE_NUMBER', '2025-12-01', SALARY_RATE, ORG_RATE, 'cmjhk9737000011tvsh4uxnmg', 'JOB_ID', true, NOW(), NOW()),
-- 
-- Job IDs:
-- Flagman: 'cmjip9qzs002r16nbw14uc3is'
-- Labour: 'cmjipa90g002t16nb42q6kwih'

-- Last row (NO COMMA at the end)
(generate_cuid(), 'Last Worker Name', '1001234999', '+966501999999', '2025-12-01', 22.00, 32.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW());

-- Clean up the function
DROP FUNCTION generate_cuid();

-- Verification queries
SELECT 
    '=== INSERTION SUMMARY ===' as "Status";

SELECT 
    COUNT(*) as "Total Laborers Added",
    COUNT(CASE WHEN j.name = 'Flagman' THEN 1 END) as "Flagman Workers",
    COUNT(CASE WHEN j.name = 'Labour' THEN 1 END) as "Labour Workers"
FROM laborers l
JOIN jobs j ON l."jobId" = j.id
WHERE l."startDate" = '2025-12-01';

SELECT 
    '=== RECENT ADDITIONS ===' as "Status";

SELECT 
    l.name as "Laborer Name",
    l."idNumber" as "ID Number", 
    l."phoneNumber" as "Phone",
    l."salaryRate" as "Salary (SAR/hr)",
    l."orgRate" as "Org Rate (SAR/hr)",
    j.name as "Job",
    t.name as "Tenant"
FROM laborers l
JOIN jobs j ON l."jobId" = j.id
JOIN tenants t ON l."tenantId" = t.id
WHERE l."startDate" = '2025-12-01'
ORDER BY l."createdAt" DESC
LIMIT 10;

SELECT 
    '=== TOTAL LABORERS IN SYSTEM ===' as "Status";

SELECT 
    COUNT(*) as "Total Laborers",
    t.name as "Tenant"
FROM laborers l
JOIN tenants t ON l."tenantId" = t.id
GROUP BY t.name
ORDER BY COUNT(*) DESC;