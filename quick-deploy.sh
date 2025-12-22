#!/bin/bash

# Quick deployment script to update the application with latest changes
echo "🚀 Quick deployment of SAA Contracting with latest changes..."

# Stop containers
echo "🛑 Stopping containers..."
docker-compose down

# Remove old images to force rebuild
echo "🧹 Cleaning old images..."
docker image rm saacontracting-app || true

# Build and start with no cache
echo "🏗️ Building and starting application..."
docker-compose up -d --build --no-cache app

# Wait for application
echo "⏳ Waiting for application to start..."
sleep 15

# Check status
echo "🔍 Checking application status..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application deployed successfully!"
    echo ""
    echo "📱 Access: http://localhost:3000"
    echo "🔐 Login: admin / saacontracting2024"
    echo ""
    echo "🆕 P&L Report should now be visible in the navigation menu!"
    echo "📊 Direct link: http://localhost:3000/profit-loss"
else
    echo "⚠️ Application might not be ready yet. Checking logs..."
    docker logs saa-contracting-app --tail 20
fi