#!/bin/bash

# SAA Contracting - Run Database Migrations

echo "🗄️  Running database migrations..."

# Stop the current container
docker stop saa-contracting-app 2>/dev/null || true
docker rm saa-contracting-app 2>/dev/null || true

# Build the image
echo "🔨 Building Docker image..."
docker build -f Dockerfile.debian -t saa-contracting-app .

# Run migrations in a temporary container as root
echo "📊 Running Prisma migrations..."
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="postgresql://postgres:mysecretpassword@host.docker.internal:5432/saa_contracting" \
  -v $(pwd)/prisma:/app/prisma \
  --user root \
  saa-contracting-app \
  sh -c "npx prisma generate && npx prisma migrate deploy"

# Start the application container
echo "🚀 Starting application container..."
docker run -d \
  --name saa-contracting-app \
  --add-host=host.docker.internal:host-gateway \
  -p 127.0.0.1:3000:3000 \
  -e DATABASE_URL="postgresql://postgres:mysecretpassword@host.docker.internal:5432/saa_contracting" \
  -e JWT_SECRET="saa-contracting-jwt-secret-key-change-in-production" \
  -e NODE_ENV="production" \
  -e PORT=3000 \
  -v $(pwd)/prisma:/app/prisma \
  --restart unless-stopped \
  saa-contracting-app

echo "✅ SAA Contracting is now running!"
echo "🌐 Application: http://localhost:3000"
echo "📊 Check logs: docker logs -f saa-contracting-app"