#!/bin/bash

# Staging Database Seeder Script
# Seeds the staging database with comprehensive test data

set -e

echo "🌱 Starting staging database seeding..."

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Apply test data
echo "📝 Applying test data fixtures..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < /app/fixtures/test-data.sql

if [ $? -eq 0 ]; then
    echo "✅ Test data applied successfully!"
else
    echo "❌ Failed to apply test data"
    exit 1
fi

# Create test users with known passwords via API
echo "🔐 Creating test users with passwords..."

# Wait for backend API to be ready
echo "⏳ Waiting for backend API to be ready..."
until curl -f $API_URL/health 2>/dev/null; do
  echo "Backend API is unavailable - sleeping"
  sleep 2
done

echo "✅ Backend API is ready!"

# Update passwords using bcrypt hashes for known test passwords
# These passwords match what's in the test files
PASSWORDS=(
    "amartinez:SuperAdmin#2024!"
    "dthompson:Admin\$ecure123"
    "sjohnson:SecureP@ssw0rd2024!"
    "jwong:Plugin@Manager99"
    "rgarcia:Editor#Pass2024"
    "mchen:MyStr0ng#Pass"
    "echen:Viewer\$Only123"
    "guestuser:Guest@Access01"
    "alee:Dev@ccess2024"
    "kpatel:Tech\$olution99"
    "mjones:Support#Help24"
)

for user_pass in "${PASSWORDS[@]}"; do
    IFS=':' read -r username password <<< "$user_pass"
    
    # Generate bcrypt hash (using Node.js since we have it)
    HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$password', 10));" 2>/dev/null || echo "")
    
    if [ -n "$HASH" ]; then
        # Update password in database
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
            "UPDATE users SET password_hash = '$HASH' WHERE username = '$username';" 2>/dev/null
        echo "✅ Updated password for $username"
    fi
done

# Verify data was seeded
echo "🔍 Verifying seeded data..."

USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null)
ROLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM roles;" 2>/dev/null)
PLUGIN_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM plugins;" 2>/dev/null)

echo "📊 Seeded data summary:"
echo "  - Users: $USER_COUNT"
echo "  - Roles: $ROLE_COUNT"
echo "  - Plugins: $PLUGIN_COUNT"

echo "🎉 Staging database seeding completed successfully!"