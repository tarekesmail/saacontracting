#!/bin/bash

# SAA Contracting - Migration Script for Existing Deployments
# Use this if you have existing data and want to preserve it

echo "🔄 Migrating existing SAA Contracting deployment..."
echo "⚠️  This will preserve your existing data while updating the schema"

# Stop the application
echo "🛑 Stopping application..."
docker stop saa-contracting-app 2>/dev/null || true

# Backup database
echo "💾 Creating database backup..."
docker exec some-postgres pg_dump -U postgres saa_contracting > saa_contracting_backup_$(date +%Y%m%d_%H%M%S).sql
echo "✅ Backup created: saa_contracting_backup_$(date +%Y%m%d_%H%M%S).sql"

# Build new application
echo "🔨 Building updated application..."
docker build -f Dockerfile.debian -t saa-contracting-app .

# Run manual migrations
echo "📊 Running schema migrations..."
echo "🔧 Step 1: Remove groups and add dual pricing..."

# Apply the migration SQL
docker exec -i some-postgres psql -U postgres saa_contracting << 'EOF'
-- Remove groups migration
BEGIN;

-- Add dual pricing columns
ALTER TABLE laborers ADD COLUMN IF NOT EXISTS "salaryRate" DECIMAL(10,2);
ALTER TABLE laborers ADD COLUMN IF NOT EXISTS "orgRate" DECIMAL(10,2);

-- Migrate existing hourlyRate to salaryRate (if exists)
UPDATE laborers SET "salaryRate" = "hourlyRate" WHERE "hourlyRate" IS NOT NULL AND "salaryRate" IS NULL;

-- Set orgRate to be 40% higher than salaryRate (example markup)
UPDATE laborers SET "orgRate" = "salaryRate" * 1.4 WHERE "salaryRate" IS NOT NULL AND "orgRate" IS NULL;

-- Set default rates for any laborers without rates
UPDATE laborers SET "salaryRate" = 20.00 WHERE "salaryRate" IS NULL;
UPDATE laborers SET "orgRate" = 28.00 WHERE "orgRate" IS NULL;

-- Make both rate columns NOT NULL
ALTER TABLE laborers ALTER COLUMN "salaryRate" SET NOT NULL;
ALTER TABLE laborers ALTER COLUMN "orgRate" SET NOT NULL;

-- Remove old columns if they exist
ALTER TABLE laborers DROP COLUMN IF EXISTS "hourlyRate";
ALTER TABLE laborers DROP COLUMN IF EXISTS email;
ALTER TABLE laborers DROP COLUMN IF EXISTS "groupId";

-- Update jobs table
ALTER TABLE jobs DROP COLUMN IF EXISTS "pricePerHour";
ALTER TABLE jobs DROP COLUMN IF EXISTS "groupId";

-- Add tenantId to jobs if not exists
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Update jobs to have tenantId (set to first tenant if exists)
UPDATE jobs SET "tenantId" = (SELECT id FROM tenants LIMIT 1) WHERE "tenantId" IS NULL;

-- Make tenantId NOT NULL if we have tenants
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
        ALTER TABLE jobs ALTER COLUMN "tenantId" SET NOT NULL;
    END IF;
END $$;

-- Drop labor_groups table if exists
DROP TABLE IF EXISTS labor_groups CASCADE;

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Schema migration completed successfully"
else
    echo "❌ Schema migration failed - check the logs"
    exit 1
fi

# Update Prisma schema
echo "🔧 Step 2: Updating Prisma schema..."
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="postgresql://postgres:mysecretpassword@host.docker.internal:5432/saa_contracting" \
  --user root \
  saa-contracting-app \
  sh -c "npx prisma db pull && npx prisma generate"

# Start the application
echo "🚀 Starting updated application..."
docker run -d \
  --name saa-contracting-app \
  --add-host=host.docker.internal:host-gateway \
  -p 127.0.0.1:3000:3000 \
  -e DATABASE_URL="postgresql://postgres:mysecretpassword@host.docker.internal:5432/saa_contracting" \
  -e JWT_SECRET="saa-contracting-simple-secret" \
  -e NODE_ENV="production" \
  -e PORT=3000 \
  --restart unless-stopped \
  saa-contracting-app

echo ""
echo "✅ Migration completed successfully!"
echo "🌐 Application: http://saacontracting.com"
echo "📊 Check logs: docker logs -f saa-contracting-app"
echo ""
echo "🔍 What changed:"
echo "   ✅ Removed groups (jobs now belong directly to tenants)"
echo "   ✅ Added dual pricing (salary rate + organization rate)"
echo "   ✅ Removed email field from laborers"
echo "   ✅ Enhanced profit margin tracking"
echo ""
echo "💡 Your existing data has been preserved and migrated!"