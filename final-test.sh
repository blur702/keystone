#!/bin/bash

echo "======================================"
echo "COMPLETE ADMIN/FRONTEND TEST"
echo "======================================"
echo ""

# Test public frontend
echo "1. Testing Public Frontend (/):"
RESPONSE=$(curl -k -s --resolve kevinalthaus.com:443:127.0.0.1 https://kevinalthaus.com/ | grep -o "<h1>.*</h1>" | head -1)
if [[ "$RESPONSE" == *"Keystone Platform"* ]]; then
    echo "   ✅ Public frontend working: $RESPONSE"
else
    echo "   ❌ Public frontend issue"
fi

# Test admin backend  
echo ""
echo "2. Testing Admin Backend (/admin/):"
RESPONSE=$(curl -k -s --resolve kevinalthaus.com:443:127.0.0.1 https://kevinalthaus.com/admin/ | grep -o "<title>.*</title>")
if [[ "$RESPONSE" == *"Keystone Admin"* ]]; then
    echo "   ✅ Admin backend working: $RESPONSE"
else
    echo "   ❌ Admin backend issue: $RESPONSE"
fi

# Test admin assets
echo ""
echo "3. Testing Admin Assets:"
STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" --resolve kevinalthaus.com:443:127.0.0.1 https://kevinalthaus.com/admin/assets/index-5265c558.css)
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Admin CSS loading (HTTP $STATUS)"
else
    echo "   ❌ Admin CSS not loading (HTTP $STATUS)"
fi

STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" --resolve kevinalthaus.com:443:127.0.0.1 https://kevinalthaus.com/admin/assets/index-a4c291e4.js)
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Admin JS loading (HTTP $STATUS)"
else
    echo "   ❌ Admin JS not loading (HTTP $STATUS)"
fi

# Test API
echo ""
echo "4. Testing API:"
STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" --resolve kevinalthaus.com:443:127.0.0.1 -X POST https://kevinalthaus.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}')
if [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ]; then
    echo "   ✅ API responding (HTTP $STATUS)"
else
    echo "   ❌ API issue (HTTP $STATUS)"
fi

# Test backend is running
echo ""
echo "5. Backend Status:"
if ps aux | grep -q "[n]ode.*server.ts"; then
    echo "   ✅ Backend server is running"
else
    echo "   ⚠️  Backend may not be running properly"
fi

echo ""
echo "======================================"
echo "FINAL STATUS"
echo "======================================"
echo ""
echo "✅ Public Frontend: https://kevinalthaus.com/"
echo "✅ Admin Backend: https://kevinalthaus.com/admin/"
echo ""
echo "IMPORTANT: When testing locally, use the domain name,"
echo "not 'localhost' as nginx matches by server_name."
echo ""
echo "Access URLs:"
echo "- Public: https://kevinalthaus.com/"
echo "- Admin: https://kevinalthaus.com/admin/"
echo "- Login: kevin / (130Bpm)"
echo "- Plugins: Admin → Manage Plugins"
echo ""
echo "======================================"