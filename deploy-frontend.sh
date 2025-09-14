#!/bin/bash

# Campus Vibe Frontend Deployment Script (Legacy)
# Deploys React frontend to S3 with CloudFront CDN for cost-effective AWS hosting
# 
# NOTE: For enhanced deployment with CloudFormation infrastructure management,
# use scripts/deploy-s3-cloudfront.sh instead.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_REGION="us-east-1"
CLOUDFRONT_PRICE_CLASS="PriceClass_100"  # Use only US, Canada, Europe for cost optimization
CACHE_TTL_STATIC=31536000  # 1 year for static assets
CACHE_TTL_HTML=86400       # 1 day for HTML files

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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Campus Vibe Frontend Deployment Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -b, --bucket BUCKET        S3 bucket name (required)
    -r, --region REGION        AWS region (default: us-east-1)
    -e, --env ENVIRONMENT      Environment (staging|production, default: production)
    -d, --domain DOMAIN        Custom domain for CloudFront (optional)
    -c, --certificate ARN      SSL certificate ARN for custom domain (optional)
    --skip-cloudfront          Skip CloudFront setup (S3 only)
    --skip-build              Skip frontend build step
    -h, --help                Show this help message

EXAMPLES:
    $0 -b my-campus-vibe-bucket
    $0 -b my-bucket -e staging -r us-west-2
    $0 -b my-bucket -d campusvibe.com -c arn:aws:acm:us-east-1:123456789012:certificate/abc123

ENVIRONMENT VARIABLES:
    AWS_PROFILE               AWS profile to use (optional)
    S3_BUCKET                Alternative way to specify bucket name
    AWS_REGION               Alternative way to specify region

EOF
}

# Validate dependencies
check_dependencies() {
    print_step "Checking dependencies..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        print_error "Node.js and npm are required but not installed."
        exit 1
    fi
    
    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. Some features may be limited."
        print_warning "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    fi
    
    print_status "All dependencies are available"
}

# Build frontend
build_frontend() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping frontend build as requested"
        return
    fi
    
    print_step "Building frontend for $ENVIRONMENT environment..."
    
    cd client
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Build for specific environment
    if [ "$ENVIRONMENT" = "production" ]; then
        npm run build:production
    else
        npm run build:staging
    fi
    
    cd ..
    
    # Verify build output
    if [ ! -d "client/build" ]; then
        print_error "Build failed - no build directory found"
        exit 1
    fi
    
    print_status "Frontend build completed successfully"
}

# Create S3 bucket
create_s3_bucket() {
    print_step "Setting up S3 bucket: $BUCKET_NAME"
    
    # Check if bucket exists
    if aws s3 ls "s3://$BUCKET_NAME" &> /dev/null; then
        print_status "S3 bucket already exists: $BUCKET_NAME"
    else
        print_status "Creating S3 bucket: $BUCKET_NAME"
        
        if [ "$REGION" = "us-east-1" ]; then
            aws s3 mb "s3://$BUCKET_NAME" --region "$REGION"
        else
            aws s3 mb "s3://$BUCKET_NAME" --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION"
        fi
    fi
    
    # Configure bucket for static website hosting
    print_status "Configuring static website hosting..."
    aws s3 website "s3://$BUCKET_NAME" \
        --index-document index.html \
        --error-document index.html \
        --region "$REGION"
    
    # Set bucket policy for public read access
    print_status "Setting bucket policy for public access..."
    
    BUCKET_POLICY=$(cat << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
)
    
    echo "$BUCKET_POLICY" | aws s3api put-bucket-policy \
        --bucket "$BUCKET_NAME" \
        --policy file:///dev/stdin
    
    # Configure CORS for API calls
    print_status "Configuring CORS policy..."
    
    CORS_CONFIG=$(cat << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "HEAD"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF
)
    
    echo "$CORS_CONFIG" | aws s3api put-bucket-cors \
        --bucket "$BUCKET_NAME" \
        --cors-configuration file:///dev/stdin
    
    print_status "S3 bucket configuration completed"
}

# Upload files to S3
upload_to_s3() {
    print_step "Uploading files to S3..."
    
    # Upload with appropriate cache headers
    print_status "Uploading static assets with long-term caching..."
    
    # Upload JS and CSS files with long cache
    aws s3 cp client/build/static/ "s3://$BUCKET_NAME/static/" \
        --recursive \
        --cache-control "public, max-age=$CACHE_TTL_STATIC, immutable" \
        --metadata-directive REPLACE
    
    # Upload HTML files with short cache
    print_status "Uploading HTML files with short-term caching..."
    aws s3 cp client/build/index.html "s3://$BUCKET_NAME/" \
        --cache-control "public, max-age=$CACHE_TTL_HTML, must-revalidate" \
        --content-type "text/html"
    
    # Upload other files
    print_status "Uploading remaining files..."
    aws s3 sync client/build/ "s3://$BUCKET_NAME/" \
        --exclude "static/*" \
        --exclude "index.html" \
        --cache-control "public, max-age=86400"
    
    # Upload build info
    if [ -f "client/build/build-info.json" ]; then
        aws s3 cp client/build/build-info.json "s3://$BUCKET_NAME/" \
            --cache-control "no-cache" \
            --content-type "application/json"
    fi
    
    print_status "File upload completed"
    
    # Get S3 website URL
    S3_WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
    print_status "S3 website URL: $S3_WEBSITE_URL"
}

# Create CloudFront distribution
create_cloudfront_distribution() {
    if [ "$SKIP_CLOUDFRONT" = true ]; then
        print_warning "Skipping CloudFront setup as requested"
        return
    fi
    
    print_step "Setting up CloudFront distribution..."
    
    # Check if distribution already exists
    EXISTING_DISTRIBUTION=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET_NAME.s3.amazonaws.com'].Id" --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_DISTRIBUTION" ] && [ "$EXISTING_DISTRIBUTION" != "None" ]; then
        print_status "Found existing CloudFront distribution: $EXISTING_DISTRIBUTION"
        DISTRIBUTION_ID="$EXISTING_DISTRIBUTION"
    else
        print_status "Creating new CloudFront distribution..."
        
        # Prepare distribution config
        DISTRIBUTION_CONFIG=$(cat << EOF
{
    "CallerReference": "campus-vibe-$(date +%s)",
    "Comment": "Campus Vibe Frontend Distribution - $ENVIRONMENT",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "Compress": true
    },
    "CacheBehaviors": {
        "Quantity": 2,
        "Items": [
            {
                "PathPattern": "/static/*",
                "TargetOriginId": "S3-$BUCKET_NAME",
                "ViewerProtocolPolicy": "redirect-to-https",
                "MinTTL": 31536000,
                "DefaultTTL": 31536000,
                "MaxTTL": 31536000,
                "ForwardedValues": {
                    "QueryString": false,
                    "Cookies": {
                        "Forward": "none"
                    }
                },
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "Compress": true
            },
            {
                "PathPattern": "*.html",
                "TargetOriginId": "S3-$BUCKET_NAME",
                "ViewerProtocolPolicy": "redirect-to-https",
                "MinTTL": 0,
                "DefaultTTL": 86400,
                "MaxTTL": 86400,
                "ForwardedValues": {
                    "QueryString": false,
                    "Cookies": {
                        "Forward": "none"
                    }
                },
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "Compress": true
            }
        ]
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "$CLOUDFRONT_PRICE_CLASS"
EOF
)
        
        # Add custom domain configuration if provided
        if [ -n "$CUSTOM_DOMAIN" ]; then
            DISTRIBUTION_CONFIG="$DISTRIBUTION_CONFIG,
    \"Aliases\": {
        \"Quantity\": 1,
        \"Items\": [\"$CUSTOM_DOMAIN\"]
    },
    \"ViewerCertificate\": {
        \"ACMCertificateArn\": \"$SSL_CERTIFICATE_ARN\",
        \"SSLSupportMethod\": \"sni-only\",
        \"MinimumProtocolVersion\": \"TLSv1.2_2021\"
    }"
        else
            DISTRIBUTION_CONFIG="$DISTRIBUTION_CONFIG,
    \"ViewerCertificate\": {
        \"CloudFrontDefaultCertificate\": true
    }"
        fi
        
        DISTRIBUTION_CONFIG="$DISTRIBUTION_CONFIG
}"
        
        # Create distribution
        DISTRIBUTION_RESULT=$(echo "$DISTRIBUTION_CONFIG" | aws cloudfront create-distribution --distribution-config file:///dev/stdin)
        DISTRIBUTION_ID=$(echo "$DISTRIBUTION_RESULT" | jq -r '.Distribution.Id')
        
        if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "null" ]; then
            print_error "Failed to create CloudFront distribution"
            exit 1
        fi
        
        print_status "CloudFront distribution created: $DISTRIBUTION_ID"
    fi
    
    # Get distribution details
    print_status "Getting distribution details..."
    DISTRIBUTION_DETAILS=$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID")
    CLOUDFRONT_DOMAIN=$(echo "$DISTRIBUTION_DETAILS" | jq -r '.Distribution.DomainName')
    DISTRIBUTION_STATUS=$(echo "$DISTRIBUTION_DETAILS" | jq -r '.Distribution.Status')
    
    print_status "CloudFront domain: https://$CLOUDFRONT_DOMAIN"
    print_status "Distribution status: $DISTRIBUTION_STATUS"
    
    if [ "$DISTRIBUTION_STATUS" = "InProgress" ]; then
        print_warning "Distribution is still deploying. It may take 15-20 minutes to be fully available."
    fi
    
    # Store distribution info
    echo "$DISTRIBUTION_ID" > .cloudfront-distribution-id
    echo "https://$CLOUDFRONT_DOMAIN" > .cloudfront-url
}

# Invalidate CloudFront cache
invalidate_cloudfront_cache() {
    if [ "$SKIP_CLOUDFRONT" = true ] || [ -z "$DISTRIBUTION_ID" ]; then
        return
    fi
    
    print_step "Invalidating CloudFront cache..."
    
    INVALIDATION_RESULT=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*")
    
    INVALIDATION_ID=$(echo "$INVALIDATION_RESULT" | jq -r '.Invalidation.Id')
    print_status "Cache invalidation created: $INVALIDATION_ID"
    print_warning "Cache invalidation may take 10-15 minutes to complete"
}

# Update environment configuration
update_environment_config() {
    print_step "Updating environment configuration..."
    
    # Update API URL in environment file if CloudFront is set up
    if [ "$SKIP_CLOUDFRONT" != true ] && [ -n "$CLOUDFRONT_DOMAIN" ]; then
        FRONTEND_URL="https://$CLOUDFRONT_DOMAIN"
    else
        FRONTEND_URL="$S3_WEBSITE_URL"
    fi
    
    # Create deployment info file
    DEPLOYMENT_INFO=$(cat << EOF
{
    "deployment": {
        "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
        "environment": "$ENVIRONMENT",
        "region": "$REGION",
        "bucket": "$BUCKET_NAME",
        "s3_website_url": "$S3_WEBSITE_URL",
        "cloudfront_domain": "${CLOUDFRONT_DOMAIN:-"not_configured"}",
        "cloudfront_distribution_id": "${DISTRIBUTION_ID:-"not_configured"}",
        "frontend_url": "$FRONTEND_URL"
    }
}
EOF
)
    
    echo "$DEPLOYMENT_INFO" > deployment-info.json
    print_status "Deployment info saved to deployment-info.json"
    
    # Output final URLs
    echo ""
    print_status "🎉 Frontend deployment completed successfully!"
    echo ""
    print_status "📋 Deployment Summary:"
    print_status "   Environment: $ENVIRONMENT"
    print_status "   S3 Bucket: $BUCKET_NAME"
    print_status "   S3 Website URL: $S3_WEBSITE_URL"
    
    if [ "$SKIP_CLOUDFRONT" != true ]; then
        print_status "   CloudFront URL: https://$CLOUDFRONT_DOMAIN"
        if [ -n "$CUSTOM_DOMAIN" ]; then
            print_status "   Custom Domain: https://$CUSTOM_DOMAIN"
        fi
    fi
    
    echo ""
    print_status "📝 Next Steps:"
    print_status "   1. Update your backend CORS settings to allow: $FRONTEND_URL"
    print_status "   2. Test the deployed application thoroughly"
    print_status "   3. Update DNS records if using a custom domain"
    
    if [ "$DISTRIBUTION_STATUS" = "InProgress" ]; then
        print_status "   4. Wait for CloudFront distribution to finish deploying (15-20 minutes)"
    fi
}

# Main deployment function
main() {
    print_status "🚀 Starting Campus Vibe Frontend Deployment"
    
    # Validate inputs
    if [ -z "$BUCKET_NAME" ]; then
        print_error "S3 bucket name is required. Use -b flag or set S3_BUCKET environment variable."
        show_help
        exit 1
    fi
    
    if [ -n "$CUSTOM_DOMAIN" ] && [ -z "$SSL_CERTIFICATE_ARN" ]; then
        print_error "SSL certificate ARN is required when using custom domain."
        exit 1
    fi
    
    # Run deployment steps
    check_dependencies
    build_frontend
    create_s3_bucket
    upload_to_s3
    create_cloudfront_distribution
    invalidate_cloudfront_cache
    update_environment_config
}

# Parse command line arguments
BUCKET_NAME=""
REGION="$DEFAULT_REGION"
ENVIRONMENT="production"
CUSTOM_DOMAIN=""
SSL_CERTIFICATE_ARN=""
SKIP_CLOUDFRONT=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--bucket)
            BUCKET_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--domain)
            CUSTOM_DOMAIN="$2"
            shift 2
            ;;
        -c|--certificate)
            SSL_CERTIFICATE_ARN="$2"
            shift 2
            ;;
        --skip-cloudfront)
            SKIP_CLOUDFRONT=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
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

# Use environment variables as fallback
BUCKET_NAME="${BUCKET_NAME:-$S3_BUCKET}"
REGION="${REGION:-$AWS_REGION}"
REGION="${REGION:-$DEFAULT_REGION}"

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Environment must be 'staging' or 'production'"
    exit 1
fi

# Run main function
main