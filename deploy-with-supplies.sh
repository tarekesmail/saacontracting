#!/bin/bash

# SAA Contracting - Deploy with Supplies System
# Enhanced deployment script that adds supplies management

set -e  # Exit on any error

echo "🚀 SAA Contracting - Deploy with Supplies System"
echo "================================================"

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
    echo "📊 Database exists - will add supplies system"
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

# Add all systems to existing database
if [ "$PRESERVE_DATA" = true ]; then
    echo "👥 Adding user management system..."
    
    # Check if users table already exists
    USER_TABLE_EXISTS=$(docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -c "\dt" | grep users | wc -l)
    
    if [ $USER_TABLE_EXISTS -eq 0 ]; then
        echo "📋 Creating users table and default admin..."
        docker exec -i saa-contracting-postgres psql -U postgres -d saa_contracting < add-user-management.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ User management system added successfully"
        else
            echo "❌ Failed to add user management system"
            exit 1
        fi
    else
        echo "✅ Users table already exists"
    fi

    echo "💳 Adding credits system..."
    
    # Check if credits table already exists
    CREDITS_TABLE_EXISTS=$(docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -c "\dt" | grep credits | wc -l)
    
    if [ $CREDITS_TABLE_EXISTS -eq 0 ]; then
        echo "📋 Creating credits table..."
        docker exec -i saa-contracting-postgres psql -U postgres -d saa_contracting < add-credits-system.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Credits system added successfully"
        else
            echo "❌ Failed to add credits system"
            exit 1
        fi
    else
        echo "✅ Credits table already exists"
        
        # Update credits schema if needed
        echo "🔄 Updating credits schema..."
        docker exec -i saa-contracting-postgres psql -U postgres -d saa_contracting < update-credits-schema.sql 2>/dev/null || echo "Credits schema already up to date"
    fi

    echo "📦 Adding supplies system..."
    
    # Check if supplies tables already exist
    SUPPLIES_TABLE_EXISTS=$(docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -c "\dt" | grep supplies | wc -l)
    
    if [ $SUPPLIES_TABLE_EXISTS -eq 0 ]; then
        echo "📋 Creating supplies tables..."
        docker exec -i saa-contracting-postgres psql -U postgres -d saa_contracting < add-supplies-system.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Supplies system added successfully"
        else
            echo "❌ Failed to add supplies system"
            exit 1
        fi
    else
        echo "✅ Supplies tables already exist"
    fi
fi

# Run database setup
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
echo "🔑 Default Login Credentials:"
echo "   Username: admin"
echo "   Password: saacontracting2024"
echo ""
echo "📦 Supplies System Features:"
echo "   ✅ Supply categories management"
echo "   ✅ Supply records with name, date, price, quantity"
echo "   ✅ Category-based organization with colors"
echo "   ✅ Comprehensive filtering and search"
echo "   ✅ Total value and quantity calculations"
echo "   ✅ Notes and detailed tracking"
echo "   ✅ Default categories: Water & Beverages, Office Supplies, Safety Equipment, Cleaning Supplies"
echo ""
echo "💳 Credits System Features:"
echo "   ✅ Deposit tracking (money given to accountant)"
echo "   ✅ Withdrawal tracking (money taken back)"
echo "   ✅ Advance payments management"
echo "   ✅ Simplified form (auto-confirmed transactions)"
echo "   ✅ Net balance calculations"
echo ""
echo "👥 User Management Features:"
echo "   ✅ Multi-user system with roles"
echo "   ✅ Admin and Read-Only access levels"
echo "   ✅ User creation and management"
echo "   ✅ Secure password hashing"
echo ""
echo "📋 Complete System Features:"
echo "   ✅ Dual Pricing System (Salary + Organization rates)"
echo "   ✅ Simplified Jobs (no groups)"
echo "   ✅ Individual laborer rates in SAR"
echo "   ✅ Profit margin calculations"
echo "   ✅ Enhanced tenant management"
echo "   ✅ User role-based access control"
echo "   ✅ Expense management with categories"
echo "   ✅ Invoice generation and management"
echo "   ✅ Credit/Deposit management system"
echo "   ✅ Supplies tracking and management"
echo ""
echo "🔧 Admin Tasks:"
echo "   1. Login with admin/saacontracting2024"
echo "   2. Go to Users page to create additional users"
echo "   3. Go to Supplies page to manage supply categories and records"
echo "   4. Go to Credits page to manage deposits/withdrawals"
echo "   5. Assign appropriate roles (Admin/Read Only)"
echo "   6. Create or select tenants for data management"
echo ""
echo "🔧 If you see old version:"
echo "   1. Clear browser cache (Ctrl+F5)"
echo "   2. Check: docker logs saa-contracting-app"
echo "   3. Run: ./debug-deployment.sh"

# Show final status
echo ""
echo "📊 Final Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep saa-contracting || echo "❌ No SAA Contracting containers found"

# Show system status
echo ""
echo "📦 Supplies System Status:"
SUPPLIES_COUNT=$(docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -t -c "SELECT COUNT(*) FROM supplies;" 2>/dev/null | xargs || echo "0")
CATEGORIES_COUNT=$(docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -t -c "SELECT COUNT(*) FROM supply_categories;" 2>/dev/null | xargs || echo "0")
echo "   Supply records: $SUPPLIES_COUNT"
echo "   Supply categories: $CATEGORIES_COUNT"
if docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -c "\dt" | grep -q supplies; then
    echo "   ✅ Supplies system is active"
else
    echo "   ⚠️  Supplies tables not found - check migration"
fi

echo ""
echo "💳 Credits System Status:"
CREDITS_COUNT=$(docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -t -c "SELECT COUNT(*) FROM credits;" 2>/dev/null | xargs || echo "0")
echo "   Credit records: $CREDITS_COUNT"
if docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -c "\dt" | grep -q credits; then
    echo "   ✅ Credits system is active"
else
    echo "   ⚠️  Credits table not found - check migration"
fi

echo ""
echo "👥 User Management Status:"
USER_COUNT=$(docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
echo "   Users in system: $USER_COUNT"
if [ "$USER_COUNT" -gt 0 ]; then
    echo "   ✅ User management system is active"
else
    echo "   ⚠️  No users found - check migration"
fi