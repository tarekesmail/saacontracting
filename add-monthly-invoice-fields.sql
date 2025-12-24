-- Migration: Add monthly invoice fields to support monthly invoice numbering

-- Add monthly invoice fields to invoices table
ALTER TABLE "invoices" 
ADD COLUMN "invoiceMonth" INTEGER,
ADD COLUMN "invoiceYear" INTEGER;

-- Update existing invoices to have month/year based on issueDate
UPDATE "invoices" 
SET 
    "invoiceMonth" = EXTRACT(MONTH FROM "issueDate"),
    "invoiceYear" = EXTRACT(YEAR FROM "issueDate")
WHERE "invoiceMonth" IS NULL OR "invoiceYear" IS NULL;

-- Make the fields NOT NULL after updating existing data
ALTER TABLE "invoices" 
ALTER COLUMN "invoiceMonth" SET NOT NULL,
ALTER COLUMN "invoiceYear" SET NOT NULL;

-- Drop the old unique constraint on invoiceNumber
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_invoiceNumber_key";

-- Create new unique constraint for monthly invoice numbering
ALTER TABLE "invoices" 
ADD CONSTRAINT "invoices_tenantId_invoiceNumber_invoiceMonth_invoiceYear_key" 
UNIQUE ("tenantId", "invoiceNumber", "invoiceMonth", "invoiceYear");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "invoices_month_year_idx" ON "invoices"("invoiceMonth", "invoiceYear");
CREATE INDEX IF NOT EXISTS "invoices_tenant_month_year_idx" ON "invoices"("tenantId", "invoiceMonth", "invoiceYear");

-- Verification
SELECT 'Monthly invoice fields added successfully' as status;

-- Show updated table structure
\d invoices;

SELECT 'Migration completed successfully' as final_status;