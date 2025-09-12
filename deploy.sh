#!/bin/bash

# Campus Vibe Serverless Deployment Script
# This script automates the deployment process for AWS Lambda + API Gateway

set -e

echo "🚀 Starting Campus Vibe Serverless Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is configured
check_aws_config() {
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    print_status "AWS CLI is configured"
}

# Check if serverless is installed
check_serverless() {
    if ! command -v serverless &> /dev/null; then
        print_error "Serverless Framework is not installed. Run: npm install -g serverless"
        exit 1
    fi
    print_status "Serverless Framework is installed"
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    cd server
    npm install
    cd ..
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    cd client
    npm install
    npm run build
    cd ..
}

# Deploy backend
deploy_backend() {
    print_status "Deploying backend to AWS Lambda..."
    cd server
    serverless deploy
    cd ..
}

# Deploy frontend to S3
deploy_frontend() {
    if [ -z "$S3_BUCKET" ]; then
        print_warning "S3_BUCKET environment variable not set. Skipping frontend deployment."
        return
    fi

    print_status "Deploying frontend to S3..."

    # Create bucket if it doesn't exist
    if ! aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
        print_status "Creating S3 bucket: $S3_BUCKET"
        aws s3 mb "s3://$S3_BUCKET"
    fi

    # Enable static website hosting
    aws s3 website "s3://$S3_BUCKET" --index-document index.html --error-document index.html

    # Upload files
    aws s3 cp client/build/ "s3://$S3_BUCKET" --recursive

    # Make files public
    aws s3api put-bucket-policy --bucket "$S3_BUCKET" --policy '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "PublicReadGetObject",
          "Effect": "Allow",
          "Principal": "*",
          "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::'"$S3_BUCKET"'/*"
        }
      ]
    }'

    print_status "Frontend deployed to: https://$S3_BUCKET.s3.amazonaws.com"
}

# Main deployment function
main() {
    print_status "Starting Campus Vibe deployment..."

    # Pre-deployment checks
    check_aws_config
    check_serverless

    # Install dependencies
    install_backend_deps

    # Build frontend
    build_frontend

    # Deploy backend
    deploy_backend

    # Deploy frontend (if S3_BUCKET is set)
    deploy_frontend

    print_status "🎉 Deployment completed successfully!"
    print_status "Don't forget to:"
    print_status "1. Update your frontend API calls to use the new Lambda URL"
    print_status "2. Configure MongoDB Atlas IP whitelist"
    print_status "3. Set up CloudFront for better performance (optional)"
    print_status "4. Test all features thoroughly"
}

# Help function
show_help() {
    echo "Campus Vibe Serverless Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -b, --bucket BUCKET    S3 bucket name for frontend deployment"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  S3_BUCKET             S3 bucket name (alternative to -b flag)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy backend only"
    echo "  $0 -b my-campus-bucket               # Deploy backend and frontend"
    echo "  S3_BUCKET=my-campus-bucket $0        # Same as above"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Export S3_BUCKET if set via flag
if [ -n "$S3_BUCKET" ]; then
    export S3_BUCKET
fi

# Run main function
main