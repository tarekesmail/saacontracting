-- Add timesheets table for bulk timesheet functionality

CREATE TABLE IF NOT EXISTS timesheets (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    "hoursWorked" DECIMAL(5,2) NOT NULL,
    overtime DECIMAL(5,2) NOT NULL DEFAULT 0,
    notes TEXT,
    "laborerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT timesheets_laborerId_fkey FOREIGN KEY ("laborerId") REFERENCES laborers(id) ON DELETE CASCADE,
    CONSTRAINT timesheets_jobId_fkey FOREIGN KEY ("jobId") REFERENCES jobs(id),
    CONSTRAINT timesheets_tenantId_fkey FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT timesheets_laborerId_date_key UNIQUE ("laborerId", date)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS timesheets_date_idx ON timesheets(date);
CREATE INDEX IF NOT EXISTS timesheets_tenantId_idx ON timesheets("tenantId");
CREATE INDEX IF NOT EXISTS timesheets_laborerId_idx ON timesheets("laborerId");

-- Show table structure
\d timesheets;