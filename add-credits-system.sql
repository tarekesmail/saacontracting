-- Add Credits System to SAA Contracting
-- This migration adds credit/deposit tracking functionality

BEGIN;

-- Create CreditType enum
CREATE TYPE "CreditType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ADVANCE');

-- Create CreditStatus enum  
CREATE TYPE "CreditStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- Create credits table
CREATE TABLE "credits" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "reference" TEXT,
    "type" "CreditType" NOT NULL DEFAULT 'DEPOSIT',
    "status" "CreditStatus" NOT NULL DEFAULT 'PENDING',
    "accountantName" TEXT NOT NULL,
    "accountantPhone" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "credits" ADD CONSTRAINT "credits_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX "credits_tenantId_idx" ON "credits"("tenantId");
CREATE INDEX "credits_date_idx" ON "credits"("date");
CREATE INDEX "credits_type_idx" ON "credits"("type");
CREATE INDEX "credits_status_idx" ON "credits"("status");

COMMIT;

-- Verification queries (run these to verify the migration worked)
-- SELECT COUNT(*) as credits_table_exists FROM information_schema.tables WHERE table_name = 'credits';
-- \d credits;