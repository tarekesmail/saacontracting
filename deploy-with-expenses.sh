#!/bin/bash

# Deploy SAA Contracting with Expenses System
# This script deploys the application with the new expense management features

set -e

echo "🚀 Starting SAA Contracting deployment with expenses system..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Remove old containers and images
echo "🧹 Cleaning up old containers..."
docker container prune -f
docker image prune -f

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is accessible
echo "🔍 Checking database connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker exec saa-contracting-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ Database is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Database failed to start after $max_attempts attempts"
        exit 1
    fi
    
    echo "⏳ Attempt $attempt/$max_attempts - waiting for database..."
    sleep 2
    ((attempt++))
done

# Run database migrations
echo "📊 Running database migrations..."

# Apply Prisma schema
echo "🔄 Applying Prisma schema..."
docker exec saa-contracting-app npx prisma db push --force-reset

# Add expense tables
echo "💰 Adding expense tables..."
if docker exec -i saa-contracting-postgres psql -U postgres saa_contracting < add-expenses-tables.sql; then
    echo "✅ Expense tables added successfully"
else
    echo "⚠️ Expense tables migration had issues, but continuing..."
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker exec saa-contracting-app npx prisma generate

# Restart the application to ensure all changes are loaded
echo "🔄 Restarting application..."
docker-compose restart app

# Wait for application to be ready
echo "⏳ Waiting for application to start..."
sleep 15

# Check if application is running
echo "🔍 Checking application status..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
else
    echo "⚠️ Application might not be fully ready yet, checking logs..."
    docker logs saa-contracting-app --tail 20
fi

# Show container status
echo "📋 Container status:"
docker-compose ps

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📱 Application: http://localhost:3000"
echo "🔐 Login: admin / saacontracting2024"
echo "🗄️ Database: localhost:5432"
echo ""
echo "🆕 New Features Added:"
echo "   • Expense Categories Management"
echo "   • Expense Tracking"
echo "   • Expense Reports with Excel Export"
echo "   • Category-based Expense Analysis"
echo ""
echo "📊 Available Reports:"
echo "   • Labor Reports (Salary Rates)"
echo "   • Client Reports (Organization Rates)"
echo "   • Expense Reports (By Category)"
echo ""
echo "🔧 To check logs: docker logs saa-contracting-app"
echo "🔧 To access database: docker exec -it saa-contracting-postgres psql -U postgres saa_contracting"