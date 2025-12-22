#!/bin/bash

echo "🧪 Testing Direct Access to P&L Report"
echo "======================================"

echo "🔍 Testing if application is running..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is running"
else
    echo "❌ Application is not accessible at http://localhost:3000"
    exit 1
fi

echo ""
echo "🔍 Testing P&L Report route directly..."
echo "Accessing: http://localhost:3000/profit-loss"

# Test the route and save response
response=$(curl -s -w "HTTPSTATUS:%{http_code}" http://localhost:3000/profit-loss)
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

echo "HTTP Status Code: $http_code"

if [ "$http_code" = "200" ]; then
    echo "✅ P&L Report route is working!"
    echo "🎉 The page exists and is accessible"
    echo ""
    echo "📋 Next steps:"
    echo "1. Clear your browser cache completely (Ctrl+Shift+Delete)"
    echo "2. Try accessing in incognito/private mode"
    echo "3. Check if Reports dropdown is clickable in the menu"
    echo "4. Look for JavaScript errors in browser console (F12)"
elif [ "$http_code" = "404" ]; then
    echo "❌ P&L Report route returns 404 - Route not found"
    echo "🔧 This means the route is not properly configured"
    echo "Need to check App.tsx routing configuration"
elif [ "$http_code" = "500" ]; then
    echo "❌ Server error (500) - Check application logs"
    echo "🔧 Run: docker logs saa-contracting-app"
else
    echo "❌ Unexpected response code: $http_code"
fi

echo ""
echo "🔍 Testing other routes for comparison..."
echo "Testing /reports route:"
reports_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/reports)
echo "Reports route status: $reports_code"

echo "Testing /expenses route:"
expenses_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/expenses)
echo "Expenses route status: $expenses_code"