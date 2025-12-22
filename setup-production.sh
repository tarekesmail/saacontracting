#!/bin/bash

# SAA Contracting Production Setup Script

echo "🚀 Setting up SAA Contracting Labor Management System"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
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

# Build the application
echo "🔨 Building application..."
docker build -f Dockerfile.debian -t saa-contracting-app .

# Stop existing container if running
docker stop saa-contracting-app 2>/dev/null || true
docker rm saa-contracting-app 2>/dev/null || true

# Run the application
echo "🚀 Starting SAA Contracting application..."
docker run -d \
  --name saa-contracting-app \
  --add-host=host.docker.internal:host-gateway \
  -p 80:3000 \
  -p 443:3000 \
  --env-file .env \
  -v $(pwd)/prisma:/app/prisma \
  --restart unless-stopped \
  saa-contracting-app \
  sh -c "npx prisma migrate deploy && node dist/server/index.js"

echo "✅ SAA Contracting is now running!"
echo "🌐 Access your application at: http://localhost"
echo "📊 Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""
echo "🔐 Your JWT secret has been auto-generated and saved to .env"
echo "⚠️  Keep your .env file secure and don't commit it to version control"