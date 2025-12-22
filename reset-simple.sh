#!/bin/bash

# SAA Contracting - Simple Reset and Deploy

echo "🔄 Resetting SAA Contracting to simple version..."

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

# Run migrations in temporary container
echo "📊 Running database migrations..."
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="postgresql://postgres:mysecretpassword@host.docker.internal:5432/saa_contracting" \
  --user root \
  saa-contracting-app \
  sh -c "npx prisma generate && npx prisma migrate dev --name init"

# Start the application
echo "🚀 Starting application..."
docker run -d \
  --name saa-contracting-app \
  --add-host=host.docker.internal:host-gateway \
  -p 127.0.0.1:3000:3000 \
  -e DATABASE_URL="postgresql://postgres:mysecretpassword@host.docker.internal:5432/saa_contracting" \
  -e JWT_SECRET="simple-secret" \
  -e NODE_ENV="production" \
  -e PORT=3000 \
  --restart unless-stopped \
  saa-contracting-app

echo "✅ SAA Contracting (Simple Version) is now running!"
echo "🌐 Application: http://saacontracting.com"
echo "📊 Check logs: docker logs -f saa-contracting-app"
echo ""
echo "📋 Simplified features:"
echo "   - No authentication required"
echo "   - No multi-tenancy"
echo "   - No user roles"
echo "   - No rate limiting"
echo "   - Simple CRUD for laborers, groups, and jobs"