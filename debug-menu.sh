#!/bin/bash

echo "🔍 SAA Contracting Menu Debug Script"
echo "======================================"

# Check if containers are running
echo "📦 Container Status:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔍 Checking if latest code is in container..."
docker exec saa-contracting-app ls -la /app/client/src/pages/ | grep -E "(ProfitLoss|Expense)" || echo "❌ Pages directory or files not found"

echo ""
echo "🔍 Checking Layout.tsx in container..."
docker exec saa-contracting-app grep -A 10 -B 5 "P&L Report" /app/client/src/components/Layout.tsx || echo "❌ P&L Report not found in Layout.tsx"

echo ""
echo "🔍 Checking App.tsx routes..."
docker exec saa-contracting-app grep -A 5 -B 5 "profit-loss" /app/client/src/App.tsx || echo "❌ profit-loss route not found in App.tsx"

echo ""
echo "🔍 Checking if ProfitLossPage exists in container..."
docker exec saa-contracting-app ls -la /app/client/src/pages/ProfitLossPage.tsx || echo "❌ ProfitLossPage.tsx not found"

echo ""
echo "🔍 Checking server routes..."
docker exec saa-contracting-app grep -A 5 -B 5 "profit-loss" /app/server/routes/reports.ts || echo "❌ profit-loss route not found in reports.ts"

echo ""
echo "🔍 Checking container file structure..."
docker exec saa-contracting-app ls -la /app/ || echo "❌ App directory not found"

echo ""
echo "🌐 Testing direct URL access..."
echo "Trying to access http://localhost:3000/profit-loss..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/profit-loss

echo ""
echo "🔍 Checking application logs for errors..."
echo "Last 20 lines of application logs:"
docker logs saa-contracting-app --tail 20

echo ""
echo "💡 Recommendations:"
echo "1. If files are missing in container, run: git pull && ./quick-deploy.sh"
echo "2. If HTTP status is 404, the route might not be properly configured"
echo "3. If you see errors in logs, those need to be fixed first"
echo "4. Try accessing directly: http://localhost:3000/profit-loss"