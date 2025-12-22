#!/bin/bash

# SAA Contracting - Simple Multi-tenant Deploy (Updated for Dual Pricing)

echo "🚀 Deploying SAA Contracting (Simple Multi-tenant with Dual Pricing)..."

# Pull latest code from git
echo "📥 Pulling latest code..."
git pull origin main

# Stop and remove existing containers
docker stop saa-contracting-app 2>/dev/null || true
docker rm saa-contracting-app 2>/dev/null || true

# Check if database exists and handle migration
echo "🗄️  Checking database..."
DB_EXISTS=$(docker exec saa-contracting-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -w saa_contracting | wc -l)

if [ $DB_EXISTS -eq 1 ]; then
    echo "📊 Database exists - running migrations..."
    # Keep existing database and run migrations
else
    echo "🆕 Creating new database..."
    docker exec -it saa-contracting-postgres createdb -U postgres saa_contracting
fi

# Build the application
echo "🔨 Building application..."
docker build -f Dockerfile.debian -t saa-contracting-app .

# Run database setup
echo "📊 Setting up database schema..."
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="postgresql://postgres:mysecretpassword@host.docker.internal:5432/saa_contracting" \
  --user root \
  saa-contracting-app \
  sh -c "npx prisma generate && npx prisma db push"

# Start the application
echo "🚀 Starting application..."
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

echo "✅ SAA Contracting is now running!"
echo "🌐 Application: http://saacontracting.com"
echo "📊 Check logs: docker logs -f saa-contracting-app"
echo ""
echo "🔑 Login Credentials:"
echo "   Username: admin"
echo "   Password: saacontracting2024"
echo ""
echo "📋 New Features:"
echo "   ✅ Dual Pricing System (Salary + Organization rates)"
echo "   ✅ Simplified Jobs (no groups needed)"
echo "   ✅ Individual laborer rates in SAR"
echo "   ✅ Profit margin calculations"
echo "   ✅ Enhanced tenant management"
echo "   ✅ Streamlined data entry"
echo ""
echo "💡 Quick Start:"
echo "   1. Login with admin/saacontracting2024"
echo "   2. Create or select a tenant"
echo "   3. Add jobs (e.g., Driver, Security, Cleaner)"
echo "   4. Add laborers with salary and org rates"
echo ""
echo "🔧 Manual Migration (if needed):"
echo "   Run: docker exec -it saa-contracting-app npx prisma db push"