#!/bin/bash

# Tenant Management Script
# Make sure your server is running on port 3000

BASE_URL="http://localhost:3000/api/auth/tenants"

case "$1" in
  "list")
    echo "📋 Listing all tenants:"
    curl -s -X GET "$BASE_URL" | jq '.'
    ;;
  "create")
    if [ -z "$2" ]; then
      echo "❌ Usage: $0 create \"Tenant Name\""
      exit 1
    fi
    echo "➕ Creating tenant: $2"
    curl -s -X POST "$BASE_URL" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"$2\"}" | jq '.'
    ;;
  "delete")
    if [ -z "$2" ]; then
      echo "❌ Usage: $0 delete TENANT_ID"
      exit 1
    fi
    echo "🗑️  Deleting tenant: $2"
    curl -s -X DELETE "$BASE_URL/$2" | jq '.'
    ;;
  "update")
    if [ -z "$2" ] || [ -z "$3" ]; then
      echo "❌ Usage: $0 update TENANT_ID \"New Name\""
      exit 1
    fi
    echo "✏️  Updating tenant $2 to: $3"
    curl -s -X PUT "$BASE_URL/$2" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"$3\"}" | jq '.'
    ;;
  *)
    echo "🏢 SAA Contracting - Tenant Management"
    echo ""
    echo "Usage: $0 {list|create|delete|update}"
    echo ""
    echo "Commands:"
    echo "  list                     - List all tenants"
    echo "  create \"Tenant Name\"     - Create a new tenant"
    echo "  delete TENANT_ID         - Delete a tenant"
    echo "  update TENANT_ID \"Name\"  - Update tenant name"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 create \"Main Office\""
    echo "  $0 create \"Riyadh Branch\""
    echo "  $0 delete abc123"
    echo "  $0 update abc123 \"Updated Name\""
    ;;
esac