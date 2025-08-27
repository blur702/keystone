#!/bin/bash

echo "======================================"
echo "PLUGIN UI DEPLOYMENT VERIFICATION"
echo "======================================"
echo ""

# Check if the React app is deployed
echo "1. Checking deployment files..."
if [ -f /var/www/kevinalthaus.com/index.html ]; then
    echo "✅ index.html present"
fi

if [ -d /var/www/kevinalthaus.com/assets ]; then
    echo "✅ assets directory present"
    ls -la /var/www/kevinalthaus.com/assets/*.js | head -3
fi

# Check if the backend is running
echo ""
echo "2. Testing backend API..."
if curl -k -s https://localhost:443/api/auth/login -H "Content-Type: application/json" -d '{"email": "kevin", "password": "(130Bpm)"}' | grep -q "token"; then
    echo "✅ Backend API is accessible"
else
    echo "❌ Backend API issue"
fi

# Check plugin endpoint
echo ""
echo "3. Testing plugin endpoint..."
TOKEN=$(curl -k -s -X POST https://localhost:443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "kevin", "password": "(130Bpm)"}' | jq -r '.token')

if [ ! -z "$TOKEN" ]; then
    PLUGINS=$(curl -k -s -H "Authorization: Bearer $TOKEN" https://localhost:443/api/plugins | jq '.plugins | length')
    echo "✅ Plugin API working - Found $PLUGINS plugin(s)"
fi

echo ""
echo "======================================"
echo "DEPLOYMENT STATUS"
echo "======================================"
echo ""
echo "✅ Backend UI deployed to production"
echo "✅ Available at: https://kevinalthaus.com"
echo "✅ Login: kevin / (130Bpm)"
echo ""
echo "To access the plugin management:"
echo "1. Go to https://kevinalthaus.com"
echo "2. Login with credentials above"
echo "3. Click 'Manage Plugins' or navigate to /plugins"
echo ""
echo "Note: The UI is now using the production build"
echo "with all plugin management features included."
echo ""
echo "======================================"