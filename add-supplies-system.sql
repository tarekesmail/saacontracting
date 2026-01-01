-- Add Supplies System to SAA Contracting
-- This migration adds supply categories and supplies tracking functionality

BEGIN;

-- Create supply_categories table
CREATE TABLE "supply_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_categories_pkey" PRIMARY KEY ("id")
);

-- Create supplies table
CREATE TABLE "supplies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "categoryId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "supply_categories" ADD CONSTRAINT "supply_categories_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplies" ADD CONSTRAINT "supplies_categoryId_fkey" 
    FOREIGN KEY ("categoryId") REFERENCES "supply_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplies" ADD CONSTRAINT "supplies_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraints
CREATE UNIQUE INDEX "supply_categories_tenantId_name_key" ON "supply_categories"("tenantId", "name");

-- Create indexes for better performance
CREATE INDEX "supply_categories_tenantId_idx" ON "supply_categories"("tenantId");
CREATE INDEX "supplies_tenantId_idx" ON "supplies"("tenantId");
CREATE INDEX "supplies_categoryId_idx" ON "supplies"("categoryId");
CREATE INDEX "supplies_date_idx" ON "supplies"("date");

-- Insert default supply categories for existing tenants
INSERT INTO "supply_categories" ("id", "name", "description", "color", "tenantId", "createdAt", "updatedAt")
SELECT 
    'supply-cat-' || "id" || '-water',
    'Water & Beverages',
    'Water bottles, drinks, and beverages',
    '#3B82F6',
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tenants";

INSERT INTO "supply_categories" ("id", "name", "description", "color", "tenantId", "createdAt", "updatedAt")
SELECT 
    'supply-cat-' || "id" || '-office',
    'Office Supplies',
    'Stationery, paper, and office materials',
    '#10B981',
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tenants";

INSERT INTO "supply_categories" ("id", "name", "description", "color", "tenantId", "createdAt", "updatedAt")
SELECT 
    'supply-cat-' || "id" || '-safety',
    'Safety Equipment',
    'Safety gear, protective equipment',
    '#F59E0B',
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tenants";

INSERT INTO "supply_categories" ("id", "name", "description", "color", "tenantId", "createdAt", "updatedAt")
SELECT 
    'supply-cat-' || "id" || '-cleaning',
    'Cleaning Supplies',
    'Cleaning materials and maintenance supplies',
    '#8B5CF6',
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "tenants";

COMMIT;

-- Verification queries (run these to verify the migration worked)
-- SELECT COUNT(*) as supply_categories_count FROM "supply_categories";
-- SELECT COUNT(*) as supplies_count FROM "supplies";
-- SELECT name, color FROM "supply_categories" ORDER BY name;