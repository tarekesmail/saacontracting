-- Add tenant restriction to users table
-- Users with NULL tenantId can see all tenants
-- Users with a specific tenantId can only see that tenant's data

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
