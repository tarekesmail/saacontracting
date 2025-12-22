#!/bin/bash

# SAA Contracting - Simple Docker Run Script

echo "🚀 Starting SAA Contracting container..."

# Stop and remove existing container
docker stop saa-contracting-app 2>/dev/null || true
docker rm saa-contracting-app 2>/dev/null || true

# Build the image
echo "🔨 Building Docker image..."
docker build -f Dockerfile.debian -t saa-contracting-app .

# Run the container
echo "🐳 Starting container..."
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
  saa-contracting-app \
  sh -c "npx prisma generate && npx prisma migrate deploy && node dist/server/index.js"

echo "✅ Container started successfully!"
echo "🌐 Application running at: http://localhost:3000"
echo "📊 Check logs with: docker logs -f saa-contracting-app"