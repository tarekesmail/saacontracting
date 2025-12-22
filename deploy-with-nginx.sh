#!/bin/bash

# SAA Contracting - Complete Deployment with Nginx
# Domain: saacontracting.com

echo "🚀 Deploying SAA Contracting with Nginx Proxy"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt update
    apt install -y nginx
fi

# Prompt for database configuration
echo "📊 Database Configuration"
read -p "Enter PostgreSQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter PostgreSQL port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Enter PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -s -p "Enter PostgreSQL password: " DB_PASSWORD
echo

read -p "Enter database name (default: saa_contracting): " DB_NAME
DB_NAME=${DB_NAME:-saa_contracting}

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create .env file
echo "📝 Creating environment configuration..."
cat > .env << EOF
# Database Connection
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# JWT Secret (auto-generated)
JWT_SECRET="${JWT_SECRET}"

# Server Configuration
NODE_ENV="production"
PORT=3000
EOF

echo "✅ Environment file created"

# Create database if it doesn't exist
echo "🗄️  Setting up database..."
docker exec -it some-postgres psql -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || echo "Database may already exist"

# Build and start the application
echo "🔨 Building and starting application..."
docker-compose down 2>/dev/null || true
docker-compose up -d --build

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Test if application is running
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Application is running on port 3000"
else
    echo "❌ Application failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Setup Nginx
echo "🌐 Setting up Nginx configuration..."

# Copy Nginx configuration
cp nginx/saacontracting.com.conf /etc/nginx/sites-available/

# Enable the site
ln -sf /etc/nginx/sites-available/saacontracting.com.conf /etc/nginx/sites-enabled/

# Remove default Nginx site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx
    systemctl enable nginx
else
    echo "❌ Nginx configuration error"
    exit 1
fi

# Setup firewall (optional)
echo "🔥 Setting up firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    ufw allow ssh
    echo "✅ Firewall configured"
fi

echo ""
echo "🎉 SAA Contracting deployed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   🌐 Domain: http://saacontracting.com"
echo "   🐳 Container: saa_contracting_app"
echo "   🗄️  Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "   🔧 Nginx: Configured and running"
echo ""
echo "📝 Next Steps:"
echo "   1. Point your domain DNS to this server's IP"
echo "   2. Install SSL certificate (recommended: Let's Encrypt)"
echo "   3. Monitor logs: docker-compose logs -f"
echo "   4. Nginx logs: tail -f /var/log/nginx/saacontracting.com.*.log"
echo ""
echo "🔐 SSL Setup (optional):"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d saacontracting.com -d www.saacontracting.com"
echo ""
echo "⚠️  Security Notes:"
echo "   - Your JWT secret is in .env (keep it secure)"
echo "   - Consider setting up SSL/HTTPS"
echo "   - Monitor your application logs regularly"