#!/bin/bash

# Example script to create a tenant via API
# Make sure your server is running on port 3000

# Create a tenant
curl -X POST http://localhost:3000/api/auth/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Office"
  }'

echo ""

# Create another tenant
curl -X POST http://localhost:3000/api/auth/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Riyadh Branch"
  }'

echo ""

# List all tenants
echo "All tenants:"
curl -X GET http://localhost:3000/api/auth/tenants