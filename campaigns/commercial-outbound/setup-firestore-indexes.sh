#!/bin/bash
# Setup Firestore Indexes for Commercial Solar Campaign

set -e

PROJECT_ID="power-to-the-people-vpp"
SERVICE_ACCOUNT_KEY="/Users/admin/Projects/power-to-the-people/firebase-service-account.json"

echo "🔐 Authenticating with service account..."
export GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY"
gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS --quiet

echo ""
echo "📊 Creating Firestore indexes for project: $PROJECT_ID"
echo "=========================================="
echo ""

# Index 1: enrichedWithUtilityData + enrichedWithROI
echo "Creating index 1: enrichedWithUtilityData + enrichedWithROI..."
gcloud firestore indexes composite create \
  --collection-group=commercial_leads \
  --query-scope=COLLECTION \
  --field-config field-path=enrichedWithUtilityData,order=ascending \
  --field-config field-path=enrichedWithROI,order=ascending \
  --project=$PROJECT_ID \
  --quiet 2>&1 | grep -E "(Create request|done|error)" || true

echo ""
echo "Creating index 2: enrichedWithROI + leadPriority + emailSequence..."
gcloud firestore indexes composite create \
  --collection-group=commercial_leads \
  --query-scope=COLLECTION \
  --field-config field-path=enrichedWithROI,order=ascending \
  --field-config field-path=leadPriority,order=ascending \
  --field-config field-path=emailSequence,order=ascending \
  --project=$PROJECT_ID \
  --quiet 2>&1 | grep -E "(Create request|done|error)" || true

echo ""
echo "Creating index 3: enrichedWithROI + leadPriority + leadScore..."
gcloud firestore indexes composite create \
  --collection-group=commercial_leads \
  --query-scope=COLLECTION \
  --field-config field-path=enrichedWithROI,order=ascending \
  --field-config field-path=leadPriority,order=ascending \
  --field-config field-path=leadScore,order=descending \
  --project=$PROJECT_ID \
  --quiet 2>&1 | grep -E "(Create request|done|error)" || true

echo ""
echo "Creating index 4: leadScore + emailsOpened..."
gcloud firestore indexes composite create \
  --collection-group=commercial_leads \
  --query-scope=COLLECTION \
  --field-config field-path=leadScore,order=descending \
  --field-config field-path=emailsOpened,order=descending \
  --project=$PROJECT_ID \
  --quiet 2>&1 | grep -E "(Create request|done|error)" || true

echo ""
echo "Creating index 5: enrichedWithUtilityData + createdAt..."
gcloud firestore indexes composite create \
  --collection-group=commercial_leads \
  --query-scope=COLLECTION \
  --field-config field-path=enrichedWithUtilityData,order=ascending \
  --field-config field-path=createdAt,order=ascending \
  --project=$PROJECT_ID \
  --quiet 2>&1 | grep -E "(Create request|done|error)" || true

echo ""
echo "Creating index 6: leadId + sentAt (campaign_emails)..."
gcloud firestore indexes composite create \
  --collection-group=campaign_emails \
  --query-scope=COLLECTION \
  --field-config field-path=leadId,order=ascending \
  --field-config field-path=sentAt,order=descending \
  --project=$PROJECT_ID \
  --quiet 2>&1 | grep -E "(Create request|done|error)" || true

echo ""
echo "Creating index 7: sequenceNumber + sentAt (campaign_emails)..."
gcloud firestore indexes composite create \
  --collection-group=campaign_emails \
  --query-scope=COLLECTION \
  --field-config field-path=sequenceNumber,order=ascending \
  --field-config field-path=sentAt,order=descending \
  --project=$PROJECT_ID \
  --quiet 2>&1 | grep -E "(Create request|done|error)" || true

echo ""
echo "=========================================="
echo "✅ Index creation requests submitted!"
echo ""
echo "⏳ Indexes typically take 2-5 minutes to build."
echo "📊 Check status: https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
echo ""
echo "To verify indexes are ready, run:"
echo "  gcloud firestore indexes composite list --project=$PROJECT_ID"
echo ""
