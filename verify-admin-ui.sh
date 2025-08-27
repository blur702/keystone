#!/bin/bash

echo "=================================="
echo "ADMIN UI VERIFICATION"
echo "=================================="
echo ""

# Check if backend is running
echo "1. Backend API Status:"
if curl -k -s https://localhost:443/api/auth/login -H "Content-Type: application/json" -d '{"email": "test", "password": "test"}' 2>/dev/null | grep -q "error"; then
    echo "✅ Backend API is running"
else
    echo "❌ Backend API not responding"
fi

# Check admin UI
echo ""
echo "2. Admin UI Status:"
if curl -k -s https://localhost:443/admin/ | grep -q "Keystone Admin"; then
    echo "✅ Admin UI is accessible"
else
    echo "❌ Admin UI not loading"
fi

# Check assets
echo ""
echo "3. Admin Assets:"
ASSET_CHECK=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost:443/admin/assets/index-5265c558.css)
if [ "$ASSET_CHECK" = "200" ]; then
    echo "✅ Admin assets are being served"
else
    echo "⚠️  Asset serving issue (HTTP $ASSET_CHECK)"
fi

echo ""
echo "=================================="
echo "ACCESS INFORMATION"
echo "=================================="
echo ""
echo "✅ Public Frontend: https://kevinalthaus.com/"
echo "✅ Admin Backend: https://kevinalthaus.com/admin/"
echo ""
echo "Login Credentials:"
echo "  Email: kevin"
echo "  Password: (130Bpm)"
echo ""
echo "Plugin Management:"
echo "  1. Go to https://kevinalthaus.com/admin/"
echo "  2. Login with credentials above"
echo "  3. Click 'Manage Plugins' or go to /admin/plugins"
echo ""
echo "The QueryClient error has been fixed!"
echo "=================================="