-- Fix invoice unique constraint
-- Remove the old unique constraint on invoiceNumber alone (if exists)
-- Keep only the composite unique constraint (tenantId, invoiceNumber, invoiceMonth, invoiceYear)

-- Check current constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'invoices'::regclass;

-- Drop the unique constraint on invoiceNumber alone
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS "invoices_invoiceNumber_key";
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS "Invoice_invoiceNumber_key";

-- Verify the composite constraint exists
-- If not, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'invoices'::regclass 
        AND conname = 'invoices_tenantId_invoiceNumber_invoiceMonth_invoiceYear_key'
    ) THEN
        ALTER TABLE invoices ADD CONSTRAINT "invoices_tenantId_invoiceNumber_invoiceMonth_invoiceYear_key" 
        UNIQUE ("tenantId", "invoiceNumber", "invoiceMonth", "invoiceYear");
    END IF;
END $$;

-- Show final constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'invoices'::regclass;
