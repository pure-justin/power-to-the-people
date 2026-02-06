#!/bin/bash

# SMS Notification Configuration Script
# This script configures Twilio credentials for Firebase Cloud Functions

set -e

echo "🔔 SMS Notification Configuration"
echo "=================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
firebase projects:list &> /dev/null || {
    echo "❌ Not logged in to Firebase. Run: firebase login"
    exit 1
}

echo "📋 Current project:"
firebase use

echo ""
echo "This script will configure Twilio credentials for SMS notifications."
echo ""

# Prompt for Twilio credentials
read -p "Enter Twilio Account SID: " ACCOUNT_SID
read -p "Enter Twilio Auth Token: " AUTH_TOKEN
read -p "Enter Twilio Phone Number (format: +15551234567): " PHONE_NUMBER
read -p "Enter Admin Phone Number (format: +15551234567): " ADMIN_PHONE

echo ""
echo "📝 Setting Firebase config..."

firebase functions:config:set \
  twilio.account_sid="$ACCOUNT_SID" \
  twilio.auth_token="$AUTH_TOKEN" \
  twilio.phone_number="$PHONE_NUMBER" \
  admin.phone="$ADMIN_PHONE"

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Next steps:"
echo "1. Build functions: cd functions && npm run build"
echo "2. Deploy functions: firebase deploy --only functions"
echo "3. Test in Admin panel: https://power-to-the-people-vpp.web.app/admin"
echo ""
