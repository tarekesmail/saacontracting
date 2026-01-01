#!/bin/bash

# SAA Contracting - Deployment Debug Script
# Use this to troubleshoot deployment issues

echo "🔍 SAA Contracting Deployment Debug"
echo "=================================="

# Check if we're on the server
if [ -f "/etc/os-release" ]; then
    echo "📍 Server Environment Detected"
    echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
else
    echo "📍 Local Environment"
fi

echo ""
echo "🐳 Docker Status:"
echo "=================="

# Check Docker containers
echo "📦 Current containers:"
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📊 Container logs (last 50 lines):"
if docker ps -q -f name=saa-contracting-app > /dev/null 2>&1; then
    echo "--- SAA Contracting App Logs ---"
    docker logs --tail 50 saa-contracting-app
else
    echo "❌ SAA Contracting app container not found"
fi

echo ""
echo "🗄️  Database Status:"
echo "==================="

if docker ps -q -f name=saa-contracting-postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL container is running"
    
    # Test database connection
    echo "🔗 Testing database connection..."
    docker exec saa-contracting-postgres psql -U postgres -c "SELECT version();" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Database connection successful"
        
        # Check if our database exists
        DB_EXISTS=$(docker exec saa-contracting-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -w saa_contracting | wc -l)
        if [ $DB_EXISTS -eq 1 ]; then
            echo "✅ SAA Contracting database exists"
            
            # Check table structure
            echo "📋 Database tables:"
            docker exec saa-contracting-postgres psql -U postgres -d saa_contracting -c "\dt" 2>/dev/null || echo "❌ Could not list tables"
        else
            echo "❌ SAA Contracting database does not exist"
        fi
    else
        echo "❌ Database connection failed"
    fi
else
    echo "❌ PostgreSQL container not found"
fi

echo ""
echo "🌐 Network Status:"
echo "=================="

# Check if port 3000 is accessible
echo "🔌 Checking port 3000..."
if command -v curl > /dev/null 2>&1; then
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 || echo "❌ Port 3000 not accessible"
else
    echo "⚠️  curl not available, cannot test port 3000"
fi

# Check if nginx is running (if applicable)
if command -v nginx > /dev/null 2>&1; then
    echo "🌐 Nginx status:"
    systemctl is-active nginx 2>/dev/null || echo "❌ Nginx not running or not installed"
fi

echo ""
echo "📁 File System:"
echo "==============="

echo "📂 Current directory: $(pwd)"
echo "📄 Key files:"
ls -la package.json 2>/dev/null && echo "✅ package.json found" || echo "❌ package.json not found"
ls -la Dockerfile.debian 2>/dev/null && echo "✅ Dockerfile.debian found" || echo "❌ Dockerfile.debian not found"
ls -la docker-compose.yml 2>/dev/null && echo "✅ docker-compose.yml found" || echo "❌ docker-compose.yml not found"
ls -la prisma/schema.prisma 2>/dev/null && echo "✅ Prisma schema found" || echo "❌ Prisma schema not found"

echo ""
echo "🔧 Git Status:"
echo "=============="
git status --porcelain 2>/dev/null && echo "📝 Working directory status shown above" || echo "❌ Not a git repository"
git log --oneline -5 2>/dev/null && echo "📚 Last 5 commits shown above" || echo "❌ No git history"

echo ""
echo "💡 Troubleshooting Tips:"
echo "========================"
echo "1. If container exits with code 2: Check TypeScript compilation errors"
echo "2. If database connection fails: Ensure PostgreSQL container is running"
echo "3. If port 3000 not accessible: Check if app container is running"
echo "4. If old version visible: Clear browser cache and check git pull"
echo ""
echo "🚀 Quick fixes:"
echo "- Restart containers: docker-compose down && docker-compose up -d"
echo "- Force rebuild: ./force-rebuild-deploy.sh"
echo "- Check logs: docker logs -f saa-contracting-app"
echo "- Run migration: ./migrate-existing-deployment.sh"