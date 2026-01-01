-- Add User Management to SAA Contracting System
-- This migration adds the User table and creates the default admin user

BEGIN;

-- Create UserRole enum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'READ_ONLY');

-- Create users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'READ_ONLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Insert default admin user (password: saacontracting2024)
-- Password hash generated with bcrypt, rounds=10
INSERT INTO "users" ("id", "username", "password", "name", "email", "role", "isActive", "createdAt", "updatedAt") 
VALUES (
    'admin-user-id-001',
    'admin',
    '$2a$10$8K1p/a0dclxViNqCqNdwMe.tMp8WEK5vdHWiw7nBOYg5BXzKQvKJe',
    'System Administrator',
    'admin@saacontracting.com',
    'ADMIN',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

COMMIT;

-- Verification queries (run these to verify the migration worked)
-- SELECT * FROM "users";
-- SELECT COUNT(*) as user_count FROM "users";
-- SELECT username, name, role, "isActive" FROM "users" WHERE username = 'admin';