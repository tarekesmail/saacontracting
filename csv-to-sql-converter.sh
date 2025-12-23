#!/bin/bash

# CSV to SQL Converter for Laborers
# Usage: ./csv-to-sql-converter.sh laborers.csv

if [ $# -eq 0 ]; then
    echo "Usage: $0 <csv_file>"
    echo "CSV format: name,idNumber,phoneNumber,salaryRate,orgRate,jobName"
    echo "Example: Ahmed Ali,1234567890,+966501234567,25.00,35.00,Flagman"
    exit 1
fi

CSV_FILE="$1"
OUTPUT_FILE="laborers-bulk-insert.sql"

# Tenant and Job IDs
HAFAR_TENANT_ID="cmjhk9737000011tvsh4uxnmg"
MECCA_TENANT_ID="cmjhk9thx000111tvm30qti6g"
FLAGMAN_JOB_ID="cmjip9qzs002r16nbw14uc3is"
LABOUR_JOB_ID="cmjipa90g002t16nb42q6kwih"

echo "Converting CSV to SQL..."

# Create SQL file header
cat > "$OUTPUT_FILE" << 'EOF'
-- Auto-generated bulk insert for laborers
-- Generated on: $(date)

-- Function to generate CUID-like IDs
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
BEGIN
    RETURN 'cm' || substr(md5(random()::text || clock_timestamp()::text), 1, 23);
END;
$$ LANGUAGE plpgsql;

-- Bulk insert laborers
INSERT INTO laborers (
    id,
    name,
    "idNumber",
    "phoneNumber", 
    "startDate",
    "salaryRate",
    "orgRate",
    "tenantId",
    "jobId",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES 
EOF

# Process CSV file
line_count=0
while IFS=',' read -r name idNumber phoneNumber salaryRate orgRate jobName || [ -n "$name" ]; do
    # Skip header line
    if [ $line_count -eq 0 ]; then
        line_count=$((line_count + 1))
        continue
    fi
    
    # Determine job ID based on job name
    case "$jobName" in
        "Flagman"|"flagman"|"FLAGMAN")
            job_id="$FLAGMAN_JOB_ID"
            ;;
        "Labour"|"labour"|"LABOUR"|"Labor"|"labor"|"LABOR")
            job_id="$LABOUR_JOB_ID"
            ;;
        *)
            echo "Warning: Unknown job name '$jobName' for worker '$name'. Using Labour job."
            job_id="$LABOUR_JOB_ID"
            ;;
    esac
    
    # Clean up fields (remove quotes and trim whitespace)
    name=$(echo "$name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"//;s/"$//')
    idNumber=$(echo "$idNumber" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"//;s/"$//')
    phoneNumber=$(echo "$phoneNumber" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"//;s/"$//')
    salaryRate=$(echo "$salaryRate" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"//;s/"$//')
    orgRate=$(echo "$orgRate" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"//;s/"$//')
    
    # Add comma if not first data row
    if [ $line_count -gt 1 ]; then
        echo "," >> "$OUTPUT_FILE"
    fi
    
    # Generate SQL INSERT line
    echo -n "(generate_cuid(), '$name', '$idNumber', '$phoneNumber', '2025-12-01', $salaryRate, $orgRate, '$HAFAR_TENANT_ID', '$job_id', true, NOW(), NOW())" >> "$OUTPUT_FILE"
    
    line_count=$((line_count + 1))
done < "$CSV_FILE"

# Add SQL footer
cat >> "$OUTPUT_FILE" << 'EOF'
;

-- Clean up the function
DROP FUNCTION generate_cuid();

-- Verify the insert
SELECT COUNT(*) as total_laborers FROM laborers;
SELECT name, "idNumber", "phoneNumber", "startDate", "salaryRate", "orgRate", 
       (SELECT name FROM jobs WHERE id = laborers."jobId") as job_name
FROM laborers 
WHERE "startDate" = '2025-12-01'
ORDER BY "createdAt" DESC;
EOF

echo "SQL file generated: $OUTPUT_FILE"
echo ""
echo "To execute:"
echo "1. Copy the file to your server"
echo "2. Run: docker exec -i saa-contracting-postgres psql -U postgres -d saa_contracting < $OUTPUT_FILE"
echo ""
echo "CSV rows processed: $((line_count - 1))"