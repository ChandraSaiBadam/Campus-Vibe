#!/bin/bash

# Quick Frontend Deployment Script
# Simplified deployment for existing infrastructure
#
# Requirements addressed:
# - 1.4: Both frontend and backend accessible via HTTPS
# - 4.1: Frontend loads within 3 seconds globally

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
ENVIRONMENT="${1:-production}"
REGION="${AWS_REGION:-us-east-1}"

# Help function
show_help() {
    cat << EOF
Quick Frontend Deployment Script

USAGE:
    $0 [ENVIRONMENT]

ARGUMENTS:
    ENVIRONMENT    Environment to deploy to (staging|production, default: production)

EXAMPLES:
    $0                # Deploy to production
    $0 staging        # Deploy to staging

This script assumes infrastructure is already deployed via deploy-s3-cloudfront.sh
EOF
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Environment must be 'staging' or 'production'"
    exit 1
fi

print_status "🚀 Quick deploying frontend to $ENVIRONMENT environment"

# Check if deployment info exists
DEPLOYMENT_INFO_FILE="frontend-deployment-info.json"
if [ ! -f "$DEPLOYMENT_INFO_FILE" ]; then
    print_error "Deployment info file not found: $DEPLOYMENT_INFO_FILE"
    print_error "Please run deploy-s3-cloudfront.sh first to set up infrastructure"
    exit 1
fi

# Extract deployment info
if command -v jq &> /dev/null; then
    S3_BUCKET=$(jq -r '.infrastructure.s3_bucket' "$DEPLOYMENT_INFO_FILE")
    CLOUDFRONT_DISTRIBUTION_ID=$(jq -r '.infrastructure.cloudfront_distribution_id' "$DEPLOYMENT_INFO_FILE")
    CLOUDFRONT_URL=$(jq -r '.infrastructure.cloudfront_url' "$DEPLOYMENT_INFO_FILE")
else
    print_error "jq is required for this script. Please install it first."
    exit 1
fi

# Validate extracted info
if [ "$S3_BUCKET" = "null" ] || [ -z "$S3_BUCKET" ]; then
    print_error "Could not extract S3 bucket from deployment info"
    exit 1
fi

print_status "Using S3 bucket: $S3_BUCKET"
print_status "Using CloudFront distribution: $CLOUDFRONT_DISTRIBUTION_ID"

# Build frontend
print_status "Building frontend..."
cd client

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Build for environment
if [ "$ENVIRONMENT" = "production" ]; then
    npm run build:production
else
    npm run build:staging
fi

cd ..

# Verify build
if [ ! -d "client/build" ]; then
    print_error "Build failed - no build directory found"
    exit 1
fi

print_status "Build completed successfully"

# Upload to S3
print_status "Uploading to S3..."

# Upload with optimized caching
aws s3 sync client/build/ "s3://$S3_BUCKET/" \
    --region "$REGION" \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "*.html" \
    --exclude "sw.js"

# Upload HTML files with short cache
find client/build -name "*.html" -type f | while read -r file; do
    relative_path=${file#client/build/}
    aws s3 cp "$file" "s3://$S3_BUCKET/$relative_path" \
        --region "$REGION" \
        --cache-control "public, max-age=300, must-revalidate" \
        --content-type "text/html"
done

# Upload service worker with no cache
if [ -f "client/build/sw.js" ]; then
    aws s3 cp client/build/sw.js "s3://$S3_BUCKET/" \
        --region "$REGION" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "application/javascript"
fi

print_status "Upload completed"

# Invalidate CloudFront cache
if [ "$CLOUDFRONT_DISTRIBUTION_ID" != "null" ] && [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    print_status "Invalidating CloudFront cache..."
    
    INVALIDATION_RESULT=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/*" \
        --region "$REGION" \
        --output json)
    
    INVALIDATION_ID=$(echo "$INVALIDATION_RESULT" | jq -r '.Invalidation.Id')
    print_status "Cache invalidation created: $INVALIDATION_ID"
    print_warning "Cache invalidation may take 10-15 minutes to complete"
fi

# Update deployment timestamp
if command -v jq &> /dev/null; then
    UPDATED_INFO=$(jq --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        '.deployment.timestamp = $timestamp' "$DEPLOYMENT_INFO_FILE")
    echo "$UPDATED_INFO" > "$DEPLOYMENT_INFO_FILE"
fi

print_status "✅ Quick deployment completed successfully!"
print_status "🌐 Frontend URL: $CLOUDFRONT_URL"
print_warning "⏰ Allow 10-15 minutes for CloudFront cache invalidation to complete"