-- Temporary fix: Add the users table and default admin user
-- Run this if you need immediate access

BEGIN;

-- Create UserRole enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'READ_ONLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table if it doesn't exist
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

-- Create unique indexes if they don't exist
DO $$ BEGIN
    CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Insert default admin user if it doesn't exist
-- Password: saacontracting2024 (hashed with bcrypt)
INSERT INTO "users" ("id", "username", "password", "name", "email", "role", "isActive", "createdAt", "updatedAt") 
SELECT 
    'admin-user-id-001',
    'admin',
    '$2a$10$8K1p/a0dclxViNqCqNdwMe.tMp8WEK5vdHWiw7nBOYg5BXzKQvKJe',
    'System Administrator',
    'admin@saacontracting.com',
    'ADMIN',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "users" WHERE "username" = 'admin'
);

COMMIT;

-- Verify the user was created
SELECT username, name, role, "isActive" FROM "users" WHERE username = 'admin';