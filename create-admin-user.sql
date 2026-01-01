-- Create admin user manually
-- Password: saacontracting2024 (bcrypt hash)

INSERT INTO "users" ("id", "username", "password", "name", "email", "role", "isActive", "createdAt", "updatedAt") 
VALUES (
    'admin-001',
    'admin',
    '$2a$10$8K1p/a0dclxViNqCqNdwMe.tMp8WEK5vdHWiw7nBOYg5BXzKQvKJe',
    'System Administrator',
    'admin@saacontracting.com',
    'ADMIN',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (username) DO UPDATE SET
    "password" = EXCLUDED."password",
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "role" = EXCLUDED."role",
    "isActive" = EXCLUDED."isActive",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Verify the user was created/updated
SELECT 'Admin user ready' as status, username, name, role, "isActive" FROM "users" WHERE username = 'admin';