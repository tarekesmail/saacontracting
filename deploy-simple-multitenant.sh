#!/bin/bash

# SAA Contracting - Simple Multi-tenant Deploy

echo "🚀 Deploying SAA Contracting (Simple Multi-tenant)..."

# Stop and remove existing containers
docker stop saa-contracting-app 2>/dev/null || true
docker rm saa-contracting-app 2>/dev/null || true

# Drop and recreate database
echo "🗄️  Resetting database..."
docker exec -it some-postgres dropdb -U postgres saa_contracting 2>/dev/null || true
docker exec -it some-postgres createdb -U postgres saa_contracting

# Build the application
echo "🔨 Building application..."
docker build -f Dockerfile.debian -t saa-contracting-app .

# Run migrations
echo "📊 Running database migrations..."
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="postgresql://postgres:mysecretpassword@host.docker.internal:5432/saa_contracting" \
  --user root \
  saa-contracting-app \
  sh -c "npx prisma generate && npx prisma migrate dev --name simple_multitenant"

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
echo "📋 Features:"
echo "   ✅ Single username/password for all access"
echo "   ✅ Create/manage tenants from dashboard"
echo "   ✅ Multi-tenant data isolation"
echo "   ✅ Simple CRUD for laborers, groups, jobs"