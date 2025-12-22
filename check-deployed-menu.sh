#!/bin/bash

echo "🔍 Checking deployed menu structure..."

# Check if the Layout.tsx file in the container has the P&L Report
echo "📋 Checking Layout component in deployed container..."
docker exec saa-contracting-app find /app -name "*.js" -path "*/dist/client/*" -exec grep -l "P&L Report" {} \; 2>/dev/null

echo ""
echo "🔍 Checking if P&L Report route exists in built client files..."
docker exec saa-contracting-app find /app -name "*.js" -path "*/dist/client/*" -exec grep -l "profit-loss" {} \; 2>/dev/null

echo ""
echo "📊 Checking server routes for profit-loss endpoint..."
docker exec saa-contracting-app find /app -name "*.js" -path "*/dist/server/*" -exec grep -l "profit-loss" {} \; 2>/dev/null

echo ""
echo "🌐 Testing direct access to P&L endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/profit-loss

echo ""
echo "🔧 Container is running. Try these steps:"
echo "1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Check browser developer tools for any JavaScript errors"
echo "3. Try accessing directly: http://saacontracting.com/profit-loss"