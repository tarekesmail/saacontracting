-- Example SQL to insert tenants directly into the database
-- Connect to your PostgreSQL database and run these commands

-- Insert sample tenants
INSERT INTO tenants (id, name, "createdAt", "updatedAt") VALUES 
  (gen_random_uuid(), 'Main Office', NOW(), NOW()),
  (gen_random_uuid(), 'Riyadh Branch', NOW(), NOW()),
  (gen_random_uuid(), 'Jeddah Branch', NOW(), NOW()),
  (gen_random_uuid(), 'Dammam Branch', NOW(), NOW());

-- View all tenants
SELECT * FROM tenants;