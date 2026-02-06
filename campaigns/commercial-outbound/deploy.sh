#!/bin/bash

echo "🚀 Deploying Commercial Outreach Campaign System"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if logged in to Firebase
echo "📋 Checking Firebase authentication..."
firebase login:list | grep -q "No authorized accounts" && firebase login

# Set project
echo "🔧 Setting Firebase project..."
firebase use power-to-the-people-vpp

# Deploy Cloud Functions
echo ""
echo "☁️  Deploying Cloud Functions..."
firebase deploy --only functions:processOutreach,functions:trackOpen,functions:trackClick,functions:unsubscribe,functions:getCampaignAnalytics

# Create Firestore indexes
echo ""
echo "📊 Creating Firestore indexes..."
firebase deploy --only firestore:indexes

# Create Firestore rules
echo ""
echo "🔒 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Campaign System URLs:"
echo "  - Process Outreach: https://us-central1-power-to-the-people-vpp.cloudfunctions.net/processOutreach"
echo "  - Track Opens: https://us-central1-power-to-the-people-vpp.cloudfunctions.net/trackOpen"
echo "  - Track Clicks: https://us-central1-power-to-the-people-vpp.cloudfunctions.net/trackClick"
echo "  - Unsubscribe: https://us-central1-power-to-the-people-vpp.cloudfunctions.net/unsubscribe"
echo "  - Analytics: https://us-central1-power-to-the-people-vpp.cloudfunctions.net/getCampaignAnalytics"
echo ""
echo "🎯 Next steps:"
echo "  1. Run a test campaign: npm run campaign:test"
echo "  2. Launch full campaign: npm run campaign:run"
echo ""
