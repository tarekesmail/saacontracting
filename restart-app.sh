#!/bin/bash

# Quick restart script for SAA Contracting application
echo "🔄 Restarting SAA Contracting application..."

# Restart the application container
echo "🔄 Restarting application container..."
docker-compose restart app

# Wait for application to be ready
echo "⏳ Waiting for application to start..."
sleep 10

# Check if application is running
echo "🔍 Checking application status..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo "📱 Access: http://localhost:3000"
    echo "🔐 Login: admin / saacontracting2024"
else
    echo "⚠️ Application might not be fully ready yet, checking logs..."
    docker logs saa-contracting-app --tail 10
fi

echo ""
echo "🆕 New Features Available:"
echo "   • P&L Report - Complete profit & loss analysis"
echo "   • Expense Management - Track business expenses"
echo "   • Expense Reports - Category-based expense analysis"
echo ""
echo "📊 Navigate to P&L Report in the main menu or visit:"
echo "   http://localhost:3000/profit-loss"