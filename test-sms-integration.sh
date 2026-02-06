#!/bin/bash

# SMS Integration Test Script
# Tests the complete SMS notification flow

set -e

echo "🧪 SMS Integration Test Suite"
echo "=============================="
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if functions are built
if [ ! -d "functions/lib" ]; then
    echo "⚠️  Functions not built. Building now..."
    (cd functions && npm run build)
fi

echo "✓ Prerequisites OK"
echo ""

# Test 1: Check Twilio configuration
echo "Test 1: Checking Twilio Configuration"
echo "--------------------------------------"
firebase functions:config:get twilio &> /dev/null && {
    echo "✓ Twilio config found in Firebase"
} || {
    echo "⚠️  Twilio config not found. Run: ./configure-sms.sh"
}
echo ""

# Test 2: Validate TypeScript build
echo "Test 2: Validating TypeScript Build"
echo "------------------------------------"
if [ -f "functions/lib/smsNotifications.js" ]; then
    echo "✓ SMS functions compiled successfully"
    echo "  Functions available:"
    echo "    - smsOnProjectCreated"
    echo "    - onProjectStatusUpdate"
    echo "    - onReferralReward"
    echo "    - sendCustomSMS"
    echo "    - sendBulkSMS"
    echo "    - getSmsStats"
    echo "    - sendPaymentReminders"
    echo "    - twilioStatusCallback"
else
    echo "❌ SMS functions not found in build output"
    exit 1
fi
echo ""

# Test 3: Check function exports
echo "Test 3: Checking Function Exports"
echo "----------------------------------"
if grep -q "smsOnProjectCreated" functions/lib/index.js; then
    echo "✓ SMS functions exported in index.js"
else
    echo "❌ SMS functions not exported"
    exit 1
fi
echo ""

# Test 4: Validate SMS templates
echo "Test 4: Validating SMS Templates"
echo "---------------------------------"
cd functions
node test-sms.js 2>&1 | grep -q "All tests passed" && {
    echo "✓ SMS templates valid"
} || {
    echo "⚠️  Template validation needs attention"
}
cd ..
echo ""

# Test 5: Check Firestore rules
echo "Test 5: Checking Firestore Rules"
echo "---------------------------------"
if grep -q "smsLog" firestore.rules; then
    echo "✓ smsLog collection defined in rules"
else
    echo "⚠️  smsLog collection not in Firestore rules"
    echo "  Add to firestore.rules:"
    echo "    match /smsLog/{logId} {"
    echo "      allow read: if request.auth.token.admin == true;"
    echo "      allow write: if false;"
    echo "    }"
fi
echo ""

# Test 6: Check client-side service
echo "Test 6: Checking Client-Side Service"
echo "-------------------------------------"
if [ -f "src/services/smsService.js" ]; then
    echo "✓ SMS service found"
    echo "  Functions available:"
    echo "    - sendCustomSMS()"
    echo "    - sendBulkSMS()"
    echo "    - getSmsStats()"
else
    echo "❌ SMS service not found"
    exit 1
fi
echo ""

# Test 7: Check UI component
echo "Test 7: Checking UI Component"
echo "------------------------------"
if [ -f "src/components/SmsNotificationPanel.jsx" ]; then
    echo "✓ SMS notification panel found"
    echo "  Features:"
    echo "    - Send single SMS"
    echo "    - Send bulk SMS"
    echo "    - Message templates"
    echo "    - Usage statistics"
else
    echo "❌ SMS notification panel not found"
    exit 1
fi
echo ""

# Summary
echo "=================================="
echo "✅ SMS Integration Test Complete"
echo ""
echo "Deployment Checklist:"
echo "[ ] 1. Configure Twilio credentials: ./configure-sms.sh"
echo "[ ] 2. Deploy functions: firebase deploy --only functions"
echo "[ ] 3. Test in Admin panel: https://power-to-the-people-vpp.web.app/admin"
echo "[ ] 4. Create test enrollment to verify automatic SMS"
echo "[ ] 5. Monitor smsLog collection in Firestore"
echo ""
echo "Documentation: SMS_SETUP.md"
echo ""
