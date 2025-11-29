#!/bin/bash

# Script to run pickup_date migration
# This script requires admin credentials

echo "=== TripGroup pickupDate Migration ==="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:8080}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"

# Check if password is provided
if [ -z "$ADMIN_PASSWORD" ]; then
    echo "Please provide admin password:"
    read -s ADMIN_PASSWORD
    echo ""
fi

echo "Step 1: Authenticating as admin..."

# Login to get JWT token
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/transport-service/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Authentication failed!"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Authentication successful"
echo ""

echo "Step 2: Running migration..."

# Call migration endpoint with token
MIGRATION_RESPONSE=$(curl -s -X POST "$API_URL/transport-service/admin/migration/populate-pickup-dates" \
    -H "Authorization: Bearer $TOKEN")

echo "Response: $MIGRATION_RESPONSE"
echo ""

# Check if migration was successful
if echo "$MIGRATION_RESPONSE" | grep -q "Successfully"; then
    echo "✅ Migration completed successfully!"
else
    echo "⚠️  Migration may have failed. Please check the response above."
fi

echo ""
echo "=== Migration Complete ==="
