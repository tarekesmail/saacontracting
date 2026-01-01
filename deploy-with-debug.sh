#!/bin/bash

# SAA Contracting - Deploy with Debug Information
# Enhanced deployment script with better error handling and debugging

set -e  # Exit on any error

echo "🚀 SAA Contracting - Enhanced Deployment"
echo "========================================"

# Function to handle errors
handle_error() {
    echo "❌ Error occurred at line $1"
    echo "🔍 Running debug information..."
    ./debug-deployment.sh
    exit 1
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Pull latest code from git
echo "📥 Pulling latest code..."
git pull origin main

# Stop and remove existing containers
echo "🛑 Stopping existing containers..."
docker stop saa-contracting-app 2>/dev/null || true
docker rm saa-contracting-app 2>/dev/null || true

# Check if database exists and handle migration
echo "🗄️  Checking database..."
DB_EXISTS=$(docker exec saa-contracting-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -w saa_contracting | wc -l)

if [ $DB_EXISTS -eq 1 ]; then
    echo "📊 Database exists - will preserve data"
    PRESERVE_DATA=true
else
    echo "🆕 Creating new database..."
    docker exec -it saa-contracting-postgres createdb -U postgres saa_contracting
    PRESERVE_DATA=false
fi

# Build the application with better error handling
echo "🔨 Building application..."
if ! docker build -f Dockerfile.debian -t saa-contracting-app .; then
    echo "❌ Docker build failed!"
    echo "🔍 Checking for common issues..."
    
    # Check if Dockerfile exists
    if [ ! -f "Dockerfile.debian" ]; then
        echo "❌ Dockerfile.debian not found!"
        exit 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found!"
        exit 1
    fi
    
    echo "🔍 Running debug script..."
    ./debug-deployment.sh
    exit 1
fi

# Test the built image
echo "🧪 Testing built image..."
if ! docker run --rm saa-contracting-app node --version; then
    echo "❌ Built image test failed!"
    exit 1
fi

# Run database setup with error handling
echo "📊 Setting up database schema..."
if ! docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="postgresql://postgres:mysecretpassword@host.docker.internal:5432/saa_contracting" \
  --user root \
  saa-contracting-app \
  sh -c "npx prisma generate && npx prisma db push"; then
    echo "❌ Database setup failed!"
    echo "🔍 Checking database connection..."
    docker exec saa-contracting-postgres psql -U postgres -c "SELECT version();" || echo "❌ Database connection failed"
    exit 1
fi

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

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Test if application is responding
echo "🧪 Testing application..."
if curl -f -s http://localhost:3000 > /dev/null; then
    echo "✅ Application is responding!"
else
    echo "❌ Application is not responding!"
    echo "📋 Container logs:"
    docker logs saa-contracting-app
    exit 1
fi

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Application: http://saacontracting.com"
echo "📊 Check logs: docker logs -f saa-contracting-app"
echo ""
echo "🔑 Login Credentials:"
echo "   Username: admin"
echo "   Password: saacontracting2024"
echo ""
echo "📋 Features Available:"
echo "   ✅ Dual Pricing System (Salary + Organization rates)"
echo "   ✅ Simplified Jobs (no groups)"
echo "   ✅ Individual laborer rates in SAR"
echo "   ✅ Profit margin calculations"
echo "   ✅ Enhanced tenant management"
echo "   ✅ Streamlined data entry"
echo ""
echo "🔧 If you see old version:"
echo "   1. Clear browser cache (Ctrl+F5)"
echo "   2. Check: docker logs saa-contracting-app"
echo "   3. Run: ./debug-deployment.sh"

# Show final status
echo ""
echo "📊 Final Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep saa-contracting || echo "❌ No SAA Contracting containers found"