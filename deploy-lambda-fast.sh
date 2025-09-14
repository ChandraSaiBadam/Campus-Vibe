#!/bin/bash

# Fast Lambda Deployment Script
# Minimal version for quick deployments

set -e

STAGE=${1:-prod}
REGION=${AWS_REGION:-us-east-1}

echo "🚀 Fast deploying to $STAGE..."

# Quick AWS credential check
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Quick dependency check (skip install if node_modules exists)
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm ci --production && cd ..
fi

# Deploy with minimal output
echo "🔄 Deploying Lambda..."
export NODE_ENV=production
export STAGE=$STAGE

if command -v sls &> /dev/null; then
    sls deploy --stage "$STAGE" --region "$REGION"
else
    serverless deploy --stage "$STAGE" --region "$REGION"
fi

# Quick health check
echo "✅ Getting API URL..."
API_URL=$(sls info --stage "$STAGE" --region "$REGION" 2>/dev/null | grep "endpoint:" | awk '{print $2}' || echo "")

if [ -n "$API_URL" ]; then
    echo "🌐 API URL: $API_URL"
    echo "REACT_APP_API_URL=$API_URL" > .env.api
    echo "✅ Deployment complete!"
else
    echo "⚠️  Could not retrieve API URL, but deployment may have succeeded"
fi