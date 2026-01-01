-- Quick fix for login issue - Add users table and admin user

-- Create UserRole enum
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'READ_ONLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'READ_ONLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Insert admin user (password: saacontracting2024)
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
) ON CONFLICT (username) DO NOTHING;

-- Verify
SELECT 'User created successfully' as status, username, name, role FROM "users" WHERE username = 'admin';