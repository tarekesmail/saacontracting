#!/bin/bash

echo "🔄 Force rebuilding and deploying with no cache..."

# Stop and remove existing containers
docker stop saa-contracting-app 2>/dev/null || true
docker rm saa-contracting-app 2>/dev/null || true

# Remove existing image to force complete rebuild
docker rmi saa-contracting-app 2>/dev/null || true

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build with no cache
echo "🔨 Building application (no cache)..."
docker build --no-cache -f Dockerfile.debian -t saa-contracting-app .

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

echo "✅ Force rebuild complete!"
echo "🌐 Application: http://saacontracting.com"
echo "🔧 Clear your browser cache (Ctrl+F5) and check again"