#!/bin/bash

# SMS Integration Deployment Script
# Deploys SMS notification functions to Firebase

echo "🚀 Deploying SMS Notification Integration"
echo "=========================================="
echo ""

cd "$(dirname "$0")/functions"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run from project root."
  exit 1
fi

# Check environment variables
echo "✓ Checking environment variables..."
if [ ! -f ".env" ]; then
  echo "⚠️  Warning: .env file not found"
  echo "   SMS functions will use Firebase config instead"
else
  source .env
  if [ -z "$TWILIO_ACCOUNT_SID" ]; then
    echo "⚠️  Warning: TWILIO_ACCOUNT_SID not set in .env"
  else
    echo "   ✓ Twilio credentials found"
  fi
fi

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Fix errors and try again."
  exit 1
fi

echo "   ✓ Build successful"

# Deploy functions
echo ""
echo "📤 Deploying to Firebase..."
echo "   Project: power-to-the-people-vpp"
echo "   Region: us-central1"
echo ""

firebase deploy --only functions

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed. Check Firebase authentication."
  exit 1
fi

echo ""
echo "✅ SMS Integration Deployed Successfully!"
echo ""
echo "📋 Next Steps:"
echo "   1. Test via admin panel: https://power-to-the-people-vpp.web.app/admin"
echo "   2. Check function logs: firebase functions:log"
echo "   3. Create test project in Firestore to trigger enrollment SMS"
echo ""
echo "📊 Monitor usage:"
echo "   - Admin Dashboard → SMS tab"
echo "   - Firestore → smsLog collection"
echo "   - Twilio Console: https://console.twilio.com"
echo ""
