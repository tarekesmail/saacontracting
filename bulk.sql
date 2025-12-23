-- Complete Bulk Insert for 103 Laborers from CSV
-- Start Date: 2025-12-01 (1/12/2025)
-- Tenant: Hafar Al Batin (cmjhk9737000011tvsh4uxnmg)
-- Generated from labors.csv file

-- Function to generate CUID-like IDs
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
BEGIN
    RETURN 'cm' || substr(md5(random()::text || clock_timestamp()::text), 1, 23);
END;
$$ LANGUAGE plpgsql;

-- Bulk insert all 103 laborers
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

-- FLAGMAN Workers (Job ID: cmjip9qzs002r16nbw14uc3is)
(generate_cuid(), 'MUHAMMAD KHALIL', '2609972167', '+966500000001', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'IMAD UD DIN', '2607655376', '+966500000002', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'GUL RABI', '2540965239', '+966500000003', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD ABBAS', '2608172967', '+966500000004', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'ZAHID ALI KHAN', '2610909075', '+966500000005', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'SYED UMAIR ALI SHAH', '2609239120', '+966500000006', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'ZIA UR RAHMAN', '2569197979', '+966500000007', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'TASEER ULLAH', '2601491877', '+966500000008', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD AWAIS', '2615361785', '+966500000009', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'BAKHTAWAR SHAH', '2617135617', '+966500000010', '2025-12-01', 9.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'KAMRAN KHAN', '2608798878', '+966500000011', '2025-12-01', 9.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'IHTISHAM UL HAQ', '2598835888', '+966500000012', '2025-12-01', 9.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'SOHAIL AHMAD', '2594099281', '+966500000013', '2025-12-01', 9.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'SYED SHAH FAHAD', '2611377900', '+966500000014', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'MUHSIN SHAH', '2609701897', '+966500000015', '2025-12-01', 9.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'TOHEED ULLAH', '2594244002', '+966500000016', '2025-12-01', 9.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'BILAL SHAH', '2618169516', '+966500000017', '2025-12-01', 9.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'SHAHZAD KHAN', '2554423760', '+966500000018', '2025-12-01', 9.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),
(generate_cuid(), 'SAID SHAN', '2597406277', '+966500000019', '2025-12-01', 10.00, 14.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjip9qzs002r16nbw14uc3is', true, NOW(), NOW()),

-- LABOUR Workers (Job ID: cmjipa90g002t16nb42q6kwih)
(generate_cuid(), 'MASAUD KHAN', 'EJ4165821', '+966500000020', '2025-12-01', 10.00, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'NIAZ MUHAMMAD', '2615635758', '+966500000021', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SHAIR BACHA', '2610086916', '+966500000022', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ABID ULLAH', '2610545580', '+966500000023', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD KASHIF', '2530447727', '+966500000024', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'WISAL AHMAD', '2618246033', '+966500000025', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ANWAR KHAN', '2605576046', '+966500000026', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ABDUL BASIT', '2584612010', '+966500000027', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'DAWOOD SHAH', '2565191786', '+966500000028', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD FAWAD', '2560022010', '+966500000029', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'YASIR KHAN', '2542983198', '+966500000030', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'WAJID ZIA', '2561636552', '+966500000031', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'NAVEED AHAMD', '2521466249', '+966500000032', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'HAZRAT ALI', '2580156715', '+966500000033', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'NAWAB KHAN', '2611669009', '+966500000034', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'LAL BAZ KHAN', '2611229181', '+966500000035', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'AMEER HAMZA', '2611668944', '+966500000036', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'FAIZ MUHAMMAD', '2611668829', '+966500000037', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SALAH UD DEEN', '2611669298', '+966500000038', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'INAYATULLAH', '2611669652', '+966500000039', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'HABIB ULLAH', '2607056559', '+966500000040', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SHER MUHAMMAD', '2610259166', '+966500000041', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD IZAZ', '2613055777', '+966500000042', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD IBRAHIM', '2615731219', '+966500000043', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD UMAIR', '2608081796', '+966500000044', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD ASIM', '2615365745', '+966500000045', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'RASHID ALI', '2606735153', '+966500000046', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'HAROON KHAN', '2588745683', '+966500000047', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ABUBAKAR', '2566149411', '+966500000048', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'WAQAS AHMAD', '2604561650', '+966500000049', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ABUBAKAR SADIQ', '2507853295', '+966500000050', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SUDAIS BACHA', '2516240682', '+966500000051', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'RIZWAN KHAN', '2603568606', '+966500000052', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD PARVEZ', '2592173708', '+966500000053', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'YASIR SHAH', '2603186749', '+966500000054', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ABDUL SITAR', '2614240097', '+966500000055', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD RIZWAN', '2615364714', '+966500000056', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD TAYYEB', '2615635824', '+966500000057', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'RASHID AHMAD', '2615112220', '+966500000058', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'FATEH MUHAMMAD', '2596709549', '+966500000059', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'RAHMAT ALI', '2604824801', '+966500000060', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD JAVED', '2548560834', '+966500000061', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'AHMAD ALI', '2610321388', '+966500000062', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ZAID BACHA', '2614627079', '+966500000063', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'HAMEEDUR RAHMAN', '2551050426', '+966500000064', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'HAMAD KHAN', '2611704053', '+966500000065', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD HUSSAIN', '2607973902', '+966500000066', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD FAYYAZ', '2591708082', '+966500000067', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'HUSSAIN MUHAMMAD', '2530334776', '+966500000068', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'HAYAT ULLAH', '2606176531', '+966500000069', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD KASHIF 2', '2616633260', '+966500000070', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'FAHEEM AKRAM', '2615365737', '+966500000071', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'AKHTAR HUSSAIN', '2563933619', '+966500000072', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ROOH ULLAH', '2593477793', '+966500000073', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ABBAS KHAN', '2611700853', '+966500000074', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'UMAR ZADA', '2520230687', '+966500000075', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'RAHIM DAD KHAN', '2604042107', '+966500000076', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'RASHID MINHAS', '2612762092', '+966500000077', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'BILAL AHMAD', '2539676730', '+966500000078', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SAID SHAH', '2613237789', '+966500000079', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'IMRAN KHAN', '2542740341', '+966500000080', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'FAWAD KHAN', '2611700838', '+966500000081', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SYED GHAUSE ALI SHAH', '2610668895', '+966500000082', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'FAISAL KHAN', '2613345525', '+966500000083', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ABID ALI', '2616844938', '+966500000084', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'TAHIR ULLAH', '2606636732', '+966500000085', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD IBRAHIM 2', '2610400679', '+966500000086', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'WASIF KHAN', '2556549364', '+966500000087', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ASIF WALEED', '2569416163', '+966500000088', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MEHRAN KHAN', '2606898820', '+966500000089', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'WAHEEA AHMAD', '2611669751', '+966500000090', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'ZAKIR ULLAH', '2607591498', '+966500000091', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUHAMMAD ISHAQ', '2564336697', '+966500000092', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SHAHOOD ULLAH', '2596233342', '+966500000093', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'IBAD ULLAH', '2602777506', '+966500000094', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'LUQMAN KHAN', '2606493969', '+966500000095', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SULEMAN', '2611669546', '+966500000096', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'RAHMAT ALI 2', '2602201002', '+966500000097', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SHABAZ KHAN', '2600748152', '+966500000098', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MUNEEB DILDAR', '2604109187', '+966500000099', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'RAHMAT ALI 3', '2602201003', '+966500000100', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'MSAOOD PURDIL', '2614676878', '+966500000101', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),
(generate_cuid(), 'SHABAZ KHAN 2', '2600748153', '+966500000102', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW()),

-- Last row (NO COMMA at the end)
(generate_cuid(), 'MUHAMMAD IRSHAD', '2590057507', '+966500000103', '2025-12-01', 7.69, 12.00, 'cmjhk9737000011tvsh4uxnmg', 'cmjipa90g002t16nb42q6kwih', true, NOW(), NOW());

-- Clean up the function
DROP FUNCTION generate_cuid();

-- Verification queries
SELECT 
    '=== BULK INSERT COMPLETED ===' as "Status";

SELECT 
    COUNT(*) as "Total Laborers Added",
    COUNT(CASE WHEN j.name = 'Flagman' THEN 1 END) as "Flagman Workers",
    COUNT(CASE WHEN j.name = 'Labour' THEN 1 END) as "Labour Workers"
FROM laborers l
JOIN jobs j ON l."jobId" = j.id
WHERE l."startDate" = '2025-12-01';

SELECT 
    '=== SALARY BREAKDOWN ===' as "Status";

SELECT 
    j.name as "Job Type",
    COUNT(*) as "Count",
    MIN(l."salaryRate") as "Min Salary",
    MAX(l."salaryRate") as "Max Salary",
    AVG(l."salaryRate") as "Avg Salary",
    MIN(l."orgRate") as "Min Org Rate",
    MAX(l."orgRate") as "Max Org Rate",
    AVG(l."orgRate") as "Avg Org Rate"
FROM laborers l
JOIN jobs j ON l."jobId" = j.id
WHERE l."startDate" = '2025-12-01'
GROUP BY j.name
ORDER BY j.name;

SELECT 
    '=== RECENT ADDITIONS (First 10) ===' as "Status";

SELECT 
    l.name as "Laborer Name",
    l."idNumber" as "ID Number", 
    l."phoneNumber" as "Phone",
    l."salaryRate" as "Salary (SAR/hr)",
    l."orgRate" as "Org Rate (SAR/hr)",
    j.name as "Job"
FROM laborers l
JOIN jobs j ON l."jobId" = j.id
WHERE l."startDate" = '2025-12-01'
ORDER BY l."createdAt" ASC
LIMIT 10;

SELECT 
    '=== TOTAL SYSTEM SUMMARY ===' as "Status";

SELECT 
    COUNT(*) as "Total Laborers in System",
    t.name as "Tenant"
FROM laborers l
JOIN tenants t ON l."tenantId" = t.id
GROUP BY t.name
ORDER BY COUNT(*) DESC;
