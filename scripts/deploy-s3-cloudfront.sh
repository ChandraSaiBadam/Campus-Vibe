#!/bin/bash

# Enhanced S3 + CloudFront Deployment Script
# Cost-optimized deployment with CloudFormation infrastructure management
#
# Requirements addressed:
# - 1.4: Both frontend and backend accessible via HTTPS
# - 4.1: Frontend loads within 3 seconds globally
# - 4.5: Static assets served from CDN

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_REGION="us-east-1"
PROJECT_NAME="campus-vibe"
STACK_NAME_PREFIX="campus-vibe-frontend"
CLOUDFORMATION_TEMPLATE="aws/cloudformation/frontend-infrastructure.yml"

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

print_success() {
    echo -e "${PURPLE}[SUCCESS]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Enhanced S3 + CloudFront Deployment Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --env ENVIRONMENT      Environment (staging|production, default: production)
    -r, --region REGION        AWS region (default: us-east-1)
    -d, --domain DOMAIN        Custom domain for CloudFront (optional)
    -c, --certificate ARN      SSL certificate ARN for custom domain (optional)
    -p, --price-class CLASS    CloudFront price class (PriceClass_100|PriceClass_200|PriceClass_All, default: PriceClass_100)
    --stack-name NAME          Custom CloudFormation stack name
    --skip-build              Skip frontend build step
    --skip-infrastructure     Skip CloudFormation infrastructure deployment
    --force-update            Force update even if no changes detected
    -h, --help                Show this help message

EXAMPLES:
    $0                                                    # Deploy to production with defaults
    $0 -e staging -r us-west-2                          # Deploy to staging in us-west-2
    $0 -d campusvibe.com -c arn:aws:acm:us-east-1:123456789012:certificate/abc123
    $0 --skip-build --force-update                      # Update deployment without rebuilding

ENVIRONMENT VARIABLES:
    AWS_PROFILE               AWS profile to use (optional)
    AWS_REGION               Alternative way to specify region
    CUSTOM_DOMAIN            Alternative way to specify custom domain
    SSL_CERTIFICATE_ARN      Alternative way to specify SSL certificate

COST OPTIMIZATION:
    - Uses PriceClass_100 by default (US, Canada, Europe only)
    - Implements aggressive caching for static assets
    - Uses S3 Standard storage class with lifecycle policies
    - Includes cost monitoring alarms

EOF
}

# Validate dependencies
check_dependencies() {
    print_step "Checking dependencies..."
    
    local missing_deps=()
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        missing_deps+=("AWS CLI")
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. Some features may be limited."
        print_warning "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    print_status "All dependencies are available"
}

# Get AWS account ID
get_aws_account_id() {
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_status "AWS Account ID: $AWS_ACCOUNT_ID"
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
    
    # Configure API URL if backend is deployed
    if [ -f "../.serverless/stack-output.json" ]; then
        print_status "Configuring API URL from backend deployment..."
        npm run configure:api:auto || print_warning "Could not auto-configure API URL"
    fi
    
    # Build for specific environment
    if [ "$ENVIRONMENT" = "production" ]; then
        npm run build:aws:production
    else
        npm run build:aws:staging
    fi
    
    cd ..
    
    # Verify build output
    if [ ! -d "client/build" ]; then
        print_error "Build failed - no build directory found"
        exit 1
    fi
    
    # Calculate build size
    BUILD_SIZE=$(du -sh client/build | cut -f1)
    print_status "Frontend build completed successfully (Size: $BUILD_SIZE)"
}

# Deploy CloudFormation infrastructure
deploy_infrastructure() {
    if [ "$SKIP_INFRASTRUCTURE" = true ]; then
        print_warning "Skipping infrastructure deployment as requested"
        return
    fi
    
    print_step "Deploying CloudFormation infrastructure..."
    
    # Check if CloudFormation template exists
    if [ ! -f "$CLOUDFORMATION_TEMPLATE" ]; then
        print_error "CloudFormation template not found: $CLOUDFORMATION_TEMPLATE"
        exit 1
    fi
    
    # Prepare CloudFormation parameters
    local cf_params=(
        "ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME"
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
        "ParameterKey=PriceClass,ParameterValue=$PRICE_CLASS"
    )
    
    # Add custom domain parameters if provided
    if [ -n "$CUSTOM_DOMAIN" ]; then
        cf_params+=("ParameterKey=DomainName,ParameterValue=$CUSTOM_DOMAIN")
    fi
    
    if [ -n "$SSL_CERTIFICATE_ARN" ]; then
        cf_params+=("ParameterKey=CertificateArn,ParameterValue=$SSL_CERTIFICATE_ARN")
    fi
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
        print_status "Updating existing CloudFormation stack: $STACK_NAME"
        
        # Check if update is needed
        if [ "$FORCE_UPDATE" != true ]; then
            local change_set_name="update-$(date +%s)"
            
            aws cloudformation create-change-set \
                --stack-name "$STACK_NAME" \
                --template-body "file://$CLOUDFORMATION_TEMPLATE" \
                --parameters "${cf_params[@]}" \
                --change-set-name "$change_set_name" \
                --region "$REGION" \
                --capabilities CAPABILITY_IAM > /dev/null
            
            # Wait for change set creation
            aws cloudformation wait change-set-create-complete \
                --stack-name "$STACK_NAME" \
                --change-set-name "$change_set_name" \
                --region "$REGION"
            
            # Check if there are changes
            local changes=$(aws cloudformation describe-change-set \
                --stack-name "$STACK_NAME" \
                --change-set-name "$change_set_name" \
                --region "$REGION" \
                --query 'Changes[0]' \
                --output text)
            
            if [ "$changes" = "None" ]; then
                print_status "No infrastructure changes detected"
                aws cloudformation delete-change-set \
                    --stack-name "$STACK_NAME" \
                    --change-set-name "$change_set_name" \
                    --region "$REGION" > /dev/null
                return
            fi
            
            # Execute change set
            aws cloudformation execute-change-set \
                --stack-name "$STACK_NAME" \
                --change-set-name "$change_set_name" \
                --region "$REGION"
        else
            # Force update without change set
            aws cloudformation update-stack \
                --stack-name "$STACK_NAME" \
                --template-body "file://$CLOUDFORMATION_TEMPLATE" \
                --parameters "${cf_params[@]}" \
                --region "$REGION" \
                --capabilities CAPABILITY_IAM
        fi
        
        print_status "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete \
            --stack-name "$STACK_NAME" \
            --region "$REGION"
    else
        print_status "Creating new CloudFormation stack: $STACK_NAME"
        
        aws cloudformation create-stack \
            --stack-name "$STACK_NAME" \
            --template-body "file://$CLOUDFORMATION_TEMPLATE" \
            --parameters "${cf_params[@]}" \
            --region "$REGION" \
            --capabilities CAPABILITY_IAM \
            --tags "Key=Project,Value=$PROJECT_NAME" "Key=Environment,Value=$ENVIRONMENT"
        
        print_status "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete \
            --stack-name "$STACK_NAME" \
            --region "$REGION"
    fi
    
    print_success "CloudFormation infrastructure deployment completed"
}

# Get stack outputs
get_stack_outputs() {
    print_step "Retrieving stack outputs..."
    
    local outputs=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    # Extract key values
    S3_BUCKET_NAME=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="S3BucketName") | .OutputValue')
    S3_WEBSITE_URL=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="S3WebsiteURL") | .OutputValue')
    CLOUDFRONT_DISTRIBUTION_ID=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue')
    CLOUDFRONT_DOMAIN_NAME=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="CloudFrontDomainName") | .OutputValue')
    CLOUDFRONT_URL=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="CloudFrontURL") | .OutputValue')
    
    # Custom domain URL if available
    CUSTOM_DOMAIN_URL=$(echo "$outputs" | jq -r '.[] | select(.OutputKey=="CustomDomainURL") | .OutputValue // empty')
    
    print_status "S3 Bucket: $S3_BUCKET_NAME"
    print_status "CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION_ID"
    print_status "CloudFront URL: $CLOUDFRONT_URL"
    
    if [ -n "$CUSTOM_DOMAIN_URL" ] && [ "$CUSTOM_DOMAIN_URL" != "null" ]; then
        print_status "Custom Domain URL: $CUSTOM_DOMAIN_URL"
    fi
}

# Upload files to S3 with optimized caching
upload_to_s3() {
    print_step "Uploading files to S3 with optimized caching..."
    
    local build_dir="client/build"
    
    # Upload static assets with long-term caching (1 year)
    print_status "Uploading static assets with long-term caching..."
    if [ -d "$build_dir/static" ]; then
        aws s3 sync "$build_dir/static/" "s3://$S3_BUCKET_NAME/static/" \
            --region "$REGION" \
            --cache-control "public, max-age=31536000, immutable" \
            --metadata-directive REPLACE \
            --delete
    fi
    
    # Upload HTML files with short-term caching
    print_status "Uploading HTML files with short-term caching..."
    find "$build_dir" -name "*.html" -type f | while read -r file; do
        local relative_path=${file#$build_dir/}
        aws s3 cp "$file" "s3://$S3_BUCKET_NAME/$relative_path" \
            --region "$REGION" \
            --cache-control "public, max-age=300, must-revalidate" \
            --content-type "text/html"
    done
    
    # Upload service worker with no caching
    if [ -f "$build_dir/sw.js" ]; then
        print_status "Uploading service worker with no caching..."
        aws s3 cp "$build_dir/sw.js" "s3://$S3_BUCKET_NAME/" \
            --region "$REGION" \
            --cache-control "no-cache, no-store, must-revalidate" \
            --content-type "application/javascript"
    fi
    
    # Upload manifest and other JSON files
    find "$build_dir" -name "*.json" -type f | while read -r file; do
        local relative_path=${file#$build_dir/}
        aws s3 cp "$file" "s3://$S3_BUCKET_NAME/$relative_path" \
            --region "$REGION" \
            --cache-control "public, max-age=86400" \
            --content-type "application/json"
    done
    
    # Upload remaining files with default caching
    print_status "Uploading remaining files..."
    aws s3 sync "$build_dir/" "s3://$S3_BUCKET_NAME/" \
        --region "$REGION" \
        --exclude "static/*" \
        --exclude "*.html" \
        --exclude "*.json" \
        --exclude "sw.js" \
        --cache-control "public, max-age=86400" \
        --delete
    
    print_success "File upload completed"
}

# Invalidate CloudFront cache
invalidate_cloudfront_cache() {
    print_step "Invalidating CloudFront cache..."
    
    local invalidation_paths=("/*")
    
    # Create invalidation
    local invalidation_result=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "${invalidation_paths[@]}" \
        --region "$REGION" \
        --output json)
    
    local invalidation_id=$(echo "$invalidation_result" | jq -r '.Invalidation.Id')
    
    print_status "Cache invalidation created: $invalidation_id"
    print_warning "Cache invalidation may take 10-15 minutes to complete"
    
    # Store invalidation ID for tracking
    echo "$invalidation_id" > ".cloudfront-invalidation-id"
}

# Update environment configuration
update_environment_config() {
    print_step "Updating environment configuration..."
    
    # Determine the primary frontend URL
    local frontend_url="$CLOUDFRONT_URL"
    if [ -n "$CUSTOM_DOMAIN_URL" ] && [ "$CUSTOM_DOMAIN_URL" != "null" ]; then
        frontend_url="$CUSTOM_DOMAIN_URL"
    fi
    
    # Update environment file with CDN URL
    local env_file="client/.env.$ENVIRONMENT"
    if [ -f "$env_file" ]; then
        # Update CDN URL
        if grep -q "REACT_APP_CDN_URL=" "$env_file"; then
            sed -i.bak "s|REACT_APP_CDN_URL=.*|REACT_APP_CDN_URL=$CLOUDFRONT_URL|" "$env_file"
        else
            echo "REACT_APP_CDN_URL=$CLOUDFRONT_URL" >> "$env_file"
        fi
        
        # Add deployment timestamp
        if grep -q "# Deployed:" "$env_file"; then
            sed -i.bak "s|# Deployed:.*|# Deployed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")|" "$env_file"
        else
            echo "# Deployed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$env_file"
        fi
        
        rm -f "$env_file.bak"
        print_status "Updated environment file: $env_file"
    fi
    
    # Create deployment info file
    local deployment_info=$(cat << EOF
{
    "deployment": {
        "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
        "environment": "$ENVIRONMENT",
        "region": "$REGION",
        "project": "$PROJECT_NAME",
        "stack_name": "$STACK_NAME"
    },
    "infrastructure": {
        "s3_bucket": "$S3_BUCKET_NAME",
        "s3_website_url": "$S3_WEBSITE_URL",
        "cloudfront_distribution_id": "$CLOUDFRONT_DISTRIBUTION_ID",
        "cloudfront_domain": "$CLOUDFRONT_DOMAIN_NAME",
        "cloudfront_url": "$CLOUDFRONT_URL",
        "custom_domain_url": "${CUSTOM_DOMAIN_URL:-null}",
        "price_class": "$PRICE_CLASS"
    },
    "urls": {
        "primary": "$frontend_url",
        "s3_direct": "$S3_WEBSITE_URL",
        "cloudfront": "$CLOUDFRONT_URL"
    },
    "performance": {
        "cache_strategy": "aggressive_static_assets",
        "compression": "enabled",
        "http2": "enabled",
        "ssl": "enabled"
    }
}
EOF
)
    
    echo "$deployment_info" > "frontend-deployment-info.json"
    print_status "Deployment info saved to frontend-deployment-info.json"
}

# Generate deployment report
generate_deployment_report() {
    print_step "Generating deployment report..."
    
    # Get CloudFront distribution status
    local distribution_status=$(aws cloudfront get-distribution \
        --id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --region "$REGION" \
        --query 'Distribution.Status' \
        --output text)
    
    # Calculate estimated monthly cost
    local estimated_cost="< $2.00"  # Based on PriceClass_100 and typical usage
    
    echo ""
    print_success "🎉 Frontend deployment completed successfully!"
    echo ""
    print_status "📋 Deployment Summary:"
    print_status "   Project: $PROJECT_NAME"
    print_status "   Environment: $ENVIRONMENT"
    print_status "   Region: $REGION"
    print_status "   Stack: $STACK_NAME"
    echo ""
    print_status "🌐 URLs:"
    print_status "   CloudFront: $CLOUDFRONT_URL"
    print_status "   S3 Direct: $S3_WEBSITE_URL"
    
    if [ -n "$CUSTOM_DOMAIN_URL" ] && [ "$CUSTOM_DOMAIN_URL" != "null" ]; then
        print_status "   Custom Domain: $CUSTOM_DOMAIN_URL"
    fi
    
    echo ""
    print_status "📊 Infrastructure:"
    print_status "   S3 Bucket: $S3_BUCKET_NAME"
    print_status "   CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION_ID"
    print_status "   Distribution Status: $distribution_status"
    print_status "   Price Class: $PRICE_CLASS"
    echo ""
    print_status "💰 Cost Optimization:"
    print_status "   Estimated Monthly Cost: $estimated_cost"
    print_status "   Caching Strategy: Aggressive for static assets"
    print_status "   Compression: Enabled"
    print_status "   Geographic Restriction: $PRICE_CLASS regions only"
    echo ""
    print_status "📝 Next Steps:"
    print_status "   1. Test the deployed application: $CLOUDFRONT_URL"
    print_status "   2. Update backend CORS settings to allow: $CLOUDFRONT_URL"
    
    if [ -n "$CUSTOM_DOMAIN" ]; then
        print_status "   3. Update DNS records to point to: $CLOUDFRONT_DOMAIN_NAME"
    fi
    
    if [ "$distribution_status" = "InProgress" ]; then
        print_status "   4. Wait for CloudFront distribution to finish deploying (15-20 minutes)"
    fi
    
    print_status "   5. Monitor costs and performance in AWS Console"
    echo ""
    print_status "📄 Deployment details saved to: frontend-deployment-info.json"
}

# Main deployment function
main() {
    print_status "🚀 Starting Enhanced S3 + CloudFront Deployment"
    echo ""
    
    # Validate inputs
    if [ -n "$CUSTOM_DOMAIN" ] && [ -z "$SSL_CERTIFICATE_ARN" ]; then
        print_error "SSL certificate ARN is required when using custom domain."
        exit 1
    fi
    
    # Run deployment steps
    check_dependencies
    get_aws_account_id
    build_frontend
    deploy_infrastructure
    get_stack_outputs
    upload_to_s3
    invalidate_cloudfront_cache
    update_environment_config
    generate_deployment_report
}

# Parse command line arguments
ENVIRONMENT="production"
REGION="$DEFAULT_REGION"
CUSTOM_DOMAIN=""
SSL_CERTIFICATE_ARN=""
PRICE_CLASS="PriceClass_100"
STACK_NAME=""
SKIP_BUILD=false
SKIP_INFRASTRUCTURE=false
FORCE_UPDATE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
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
        -p|--price-class)
            PRICE_CLASS="$2"
            shift 2
            ;;
        --stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-infrastructure)
            SKIP_INFRASTRUCTURE=true
            shift
            ;;
        --force-update)
            FORCE_UPDATE=true
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
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-$CUSTOM_DOMAIN}"
SSL_CERTIFICATE_ARN="${SSL_CERTIFICATE_ARN:-$SSL_CERTIFICATE_ARN}"
REGION="${REGION:-$AWS_REGION}"
REGION="${REGION:-$DEFAULT_REGION}"

# Set default stack name if not provided
STACK_NAME="${STACK_NAME:-$STACK_NAME_PREFIX-$ENVIRONMENT}"

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Environment must be 'staging' or 'production'"
    exit 1
fi

# Validate price class
if [[ ! "$PRICE_CLASS" =~ ^PriceClass_(100|200|All)$ ]]; then
    print_error "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All"
    exit 1
fi

# Run main function
main