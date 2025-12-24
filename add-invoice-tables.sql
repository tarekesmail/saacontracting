-- Migration: Add Invoice and InvoiceItem tables for KSA tax-compliant invoicing

-- Create InvoiceStatus enum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- Create invoices table
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerVat" TEXT,
    "customerAddress" TEXT NOT NULL,
    "customerCity" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "vatAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paidDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "qrCode" TEXT,
    "zatcaHash" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- Create invoice_items table
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "vatAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints and indexes
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_issueDate_idx" ON "invoices"("issueDate");
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- Add foreign key constraints
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add function to generate CUID-like IDs for invoices
CREATE OR REPLACE FUNCTION generate_invoice_cuid() RETURNS TEXT AS $$
BEGIN
    RETURN 'inv_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20);
END;
$$ LANGUAGE plpgsql;

-- Verification queries
SELECT 'Invoice tables created successfully' as status;

-- Check table structure
\d invoices;
\d invoice_items;

-- Test data insertion (optional - remove in production)
-- INSERT INTO invoices (id, "invoiceNumber", "issueDate", "dueDate", "customerName", "customerAddress", "customerCity", "subtotal", "vatAmount", "totalAmount", "tenantId", "updatedAt")
-- VALUES (generate_invoice_cuid(), '000001', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'Test Customer', 'Test Address', 'Riyadh', 1000.00, 150.00, 1150.00, 'your_tenant_id_here', CURRENT_TIMESTAMP);

SELECT 'Migration completed successfully' as final_status;