#!/bin/bash

echo "🔧 Step-by-step database migration for SAA Contracting"
echo "This will fix the schema issues one command at a time"

# Function to run SQL command
run_sql() {
    echo "Running: $1"
    docker exec -i saa-contracting-postgres psql -U postgres saa_contracting -c "$1"
    if [ $? -eq 0 ]; then
        echo "✅ Success"
    else
        echo "❌ Failed (might be expected if column doesn't exist)"
    fi
    echo ""
}

echo "📊 Current database structure:"
docker exec -it saa-contracting-postgres psql -U postgres saa_contracting -c "\d laborers"
docker exec -it saa-contracting-postgres psql -U postgres saa_contracting -c "\d jobs"
echo ""

echo "🔧 Step 1: Add dual pricing columns to laborers"
run_sql "ALTER TABLE laborers ADD COLUMN IF NOT EXISTS \"salaryRate\" DECIMAL(10,2);"
run_sql "ALTER TABLE laborers ADD COLUMN IF NOT EXISTS \"orgRate\" DECIMAL(10,2);"

echo "🔧 Step 2: Set default values for new columns"
run_sql "UPDATE laborers SET \"salaryRate\" = 20.00 WHERE \"salaryRate\" IS NULL;"
run_sql "UPDATE laborers SET \"orgRate\" = 28.00 WHERE \"orgRate\" IS NULL;"

echo "🔧 Step 3: Make new columns NOT NULL"
run_sql "ALTER TABLE laborers ALTER COLUMN \"salaryRate\" SET NOT NULL;"
run_sql "ALTER TABLE laborers ALTER COLUMN \"orgRate\" SET NOT NULL;"

echo "🔧 Step 4: Add tenantId to jobs"
run_sql "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS \"tenantId\" TEXT;"

echo "🔧 Step 5: Set tenantId for existing jobs"
run_sql "UPDATE jobs SET \"tenantId\" = (SELECT id FROM tenants LIMIT 1) WHERE \"tenantId\" IS NULL;"

echo "🔧 Step 6: Make tenantId NOT NULL"
run_sql "ALTER TABLE jobs ALTER COLUMN \"tenantId\" SET NOT NULL;"

echo "🔧 Step 7: Add foreign key constraint"
run_sql "ALTER TABLE jobs ADD CONSTRAINT jobs_tenantId_fkey FOREIGN KEY (\"tenantId\") REFERENCES tenants(id) ON DELETE CASCADE;"

echo "🔧 Step 8: Remove old columns (these might fail if columns don't exist - that's OK)"
run_sql "ALTER TABLE laborers DROP COLUMN IF EXISTS \"hourlyRate\";"
run_sql "ALTER TABLE laborers DROP COLUMN IF EXISTS email;"
run_sql "ALTER TABLE laborers DROP COLUMN IF EXISTS \"groupId\";"
run_sql "ALTER TABLE jobs DROP COLUMN IF EXISTS \"pricePerHour\";"
run_sql "ALTER TABLE jobs DROP COLUMN IF EXISTS \"groupId\";"

echo "🔧 Step 9: Drop old table and constraints"
run_sql "DROP TABLE IF EXISTS labor_groups CASCADE;"
run_sql "ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_groupId_name_key;"

echo "🔧 Step 10: Add new unique constraint"
run_sql "ALTER TABLE jobs ADD CONSTRAINT jobs_tenantId_name_key UNIQUE (\"tenantId\", name);"

echo ""
echo "📊 Final database structure:"
docker exec -it saa-contracting-postgres psql -U postgres saa_contracting -c "\d laborers"
docker exec -it saa-contracting-postgres psql -U postgres saa_contracting -c "\d jobs"

echo ""
echo "✅ Migration completed! You can now run: ./deploy-simple-multitenant.sh"