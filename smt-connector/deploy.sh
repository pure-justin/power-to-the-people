#!/bin/bash
# Deploy SMT Connector to Cloud Run

set -e

PROJECT_ID="agentic-labs"
REGION="us-central1"
SERVICE_NAME="smt-connector"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying SMT Connector to Cloud Run..."
echo "   Project: ${PROJECT_ID}"
echo "   Region: ${REGION}"
echo "   Service: ${SERVICE_NAME}"
echo ""

# Build and push the container image
echo "📦 Building container image..."
gcloud builds submit --tag ${IMAGE_NAME} --project ${PROJECT_ID}

# Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 120 \
  --concurrency 10 \
  --min-instances 0 \
  --max-instances 5

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Service URL: ${SERVICE_URL}"
echo ""
echo "📝 Update your frontend .env:"
echo "   VITE_SMT_API_URL=${SERVICE_URL}"
echo ""
echo "🧪 Test with:"
echo "   curl ${SERVICE_URL}/health"
