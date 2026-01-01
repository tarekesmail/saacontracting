-- Update admin password with a fresh bcrypt hash
-- This will generate a new hash for 'saacontracting2024'

-- First, let's see the current hash
SELECT 'Current hash:' as info, password FROM users WHERE username = 'admin';

-- Update with a new hash (this is bcrypt hash for 'saacontracting2024' with salt rounds 10)
UPDATE users 
SET password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    "updatedAt" = CURRENT_TIMESTAMP 
WHERE username = 'admin';

-- Verify the update
SELECT 'Updated hash:' as info, password FROM users WHERE username = 'admin';