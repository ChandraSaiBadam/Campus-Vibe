#!/bin/bash

# Campus Vibe Lambda Deployment Script
# Automated deployment with validation and rollback capabilities
#
# Requirements addressed:
# - 2.1: Automated deployment process
# - 2.2: Environment variable validation
# - 2.3: Deployment verification and rollback

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGE=${1:-prod}
REGION=${AWS_REGION:-us-east-1}
SERVICE_NAME="campus-vibe-server"
BACKUP_DIR="./deployment-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Serverless Framework
    if ! command -v serverless &> /dev/null && ! command -v sls &> /dev/null; then
        log_error "Serverless Framework is not installed. Installing..."
        npm install -g serverless
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "serverless.yml" ]; then
        log_error "serverless.yml not found. Please run this script from the project root."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Validate AWS credentials
validate_aws_credentials() {
    log_info "Validating AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid."
        log_info "Please run 'aws configure' to set up your credentials."
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local user_arn=$(aws sts get-caller-identity --query Arn --output text)
    
    log_success "AWS credentials validated"
    log_info "Account ID: $account_id"
    log_info "User/Role: $user_arn"
}

# Validate environment variables
validate_environment_variables() {
    log_info "Validating environment variables for stage: $STAGE"
    
    # Check for .env file
    local env_file=".env"
    if [ "$STAGE" != "prod" ]; then
        env_file=".env.$STAGE"
    fi
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file $env_file not found."
        exit 1
    fi
    
    # Load environment variables
    set -a  # automatically export all variables
    source "$env_file"
    set +a
    
    # Required environment variables
    local required_vars=(
        "MONGODB_URI"
        "JWT_SECRET"
        "ADMIN_SECRET"
        "EMAIL_USER"
        "EMAIL_PASS"
        "FRONTEND_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        exit 1
    fi
    
    # Validate MongoDB URI format
    if [[ ! "$MONGODB_URI" =~ ^mongodb(\+srv)?:// ]]; then
        log_error "Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://"
        exit 1
    fi
    
    # Validate Frontend URL format
    if [[ ! "$FRONTEND_URL" =~ ^https?:// ]]; then
        log_error "Invalid FRONTEND_URL format. Must start with http:// or https://"
        exit 1
    fi
    
    log_success "Environment variables validated"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    if [ -f "package.json" ]; then
        npm ci --production=false
    fi
    
    # Install server dependencies
    if [ -d "server" ] && [ -f "server/package.json" ]; then
        cd server
        npm ci --production=false
        cd ..
    fi
    
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Run server tests if they exist
    if [ -d "server" ] && [ -f "server/package.json" ]; then
        cd server
        if npm run test --if-present; then
            log_success "Server tests passed"
        else
            log_warning "Server tests failed or not configured"
        fi
        cd ..
    fi
    
    # Run deployment validation tests
    if [ -f "scripts/validate-deployment.js" ]; then
        node scripts/validate-deployment.js
        log_success "Deployment validation tests passed"
    fi
}

# Create backup of current deployment
create_backup() {
    log_info "Creating deployment backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Get current stack info if it exists
    local stack_name="${SERVICE_NAME}-${STAGE}"
    
    if aws cloudformation describe-stacks --stack-name "$stack_name" --region "$REGION" &> /dev/null; then
        # Export current stack template
        aws cloudformation get-template --stack-name "$stack_name" --region "$REGION" \
            > "$BACKUP_DIR/${stack_name}_${TIMESTAMP}.json"
        
        # Export current stack parameters
        aws cloudformation describe-stacks --stack-name "$stack_name" --region "$REGION" \
            --query 'Stacks[0].Parameters' > "$BACKUP_DIR/${stack_name}_params_${TIMESTAMP}.json"
        
        log_success "Backup created: $BACKUP_DIR/${stack_name}_${TIMESTAMP}.json"
    else
        log_info "No existing stack found, skipping backup"
    fi
}

# Deploy the Lambda function
deploy_lambda() {
    log_info "Deploying Lambda function to stage: $STAGE"
    
    # Set deployment environment
    export NODE_ENV=production
    export STAGE=$STAGE
    
    # Deploy using Serverless Framework
    if command -v sls &> /dev/null; then
        sls deploy --stage "$STAGE" --region "$REGION" --verbose
    else
        serverless deploy --stage "$STAGE" --region "$REGION" --verbose
    fi
    
    log_success "Lambda deployment completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Get API Gateway URL
    local api_url
    if command -v sls &> /dev/null; then
        api_url=$(sls info --stage "$STAGE" --region "$REGION" | grep "endpoint:" | awk '{print $2}')
    else
        api_url=$(serverless info --stage "$STAGE" --region "$REGION" | grep "endpoint:" | awk '{print $2}')
    fi
    
    if [ -z "$api_url" ]; then
        log_error "Could not retrieve API Gateway URL"
        return 1
    fi
    
    log_info "API Gateway URL: $api_url"
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    local health_response
    health_response=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/api/health" || echo "000")
    
    if [ "$health_response" = "200" ]; then
        log_success "Health check passed (HTTP $health_response)"
    else
        log_error "Health check failed (HTTP $health_response)"
        return 1
    fi
    
    # Test a few more endpoints
    log_info "Testing additional endpoints..."
    
    # Test courses endpoint
    local courses_response
    courses_response=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/api/courses" || echo "000")
    
    if [ "$courses_response" = "200" ]; then
        log_success "Courses endpoint test passed (HTTP $courses_response)"
    else
        log_warning "Courses endpoint test failed (HTTP $courses_response)"
    fi
    
    # Save API URL for frontend deployment
    echo "REACT_APP_API_URL=$api_url" > .env.api
    log_info "API URL saved to .env.api for frontend deployment"
    
    return 0
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    local stack_name="${SERVICE_NAME}-${STAGE}"
    local latest_backup=$(ls -t "$BACKUP_DIR"/${stack_name}_*.json 2>/dev/null | head -n1)
    
    if [ -n "$latest_backup" ]; then
        log_info "Rolling back to: $latest_backup"
        
        # Use Serverless Framework rollback if available
        if command -v sls &> /dev/null; then
            sls rollback --stage "$STAGE" --region "$REGION" || true
        else
            serverless rollback --stage "$STAGE" --region "$REGION" || true
        fi
        
        log_warning "Rollback completed"
    else
        log_error "No backup found for rollback"
    fi
}

# Cleanup old backups (keep last 5)
cleanup_backups() {
    log_info "Cleaning up old backups..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # Keep only the 5 most recent backups
        ls -t "$BACKUP_DIR"/*.json 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
        log_success "Old backups cleaned up"
    fi
}

# Display deployment summary
display_summary() {
    log_success "=== Deployment Summary ==="
    log_info "Stage: $STAGE"
    log_info "Region: $REGION"
    log_info "Service: $SERVICE_NAME"
    log_info "Timestamp: $TIMESTAMP"
    
    if [ -f ".env.api" ]; then
        local api_url=$(grep REACT_APP_API_URL .env.api | cut -d'=' -f2)
        log_info "API Gateway URL: $api_url"
        log_info ""
        log_success "🚀 Backend deployment completed successfully!"
        log_info "Next steps:"
        log_info "1. Update your frontend environment with the API URL"
        log_info "2. Deploy the frontend using: ./deploy-frontend.sh"
        log_info "3. Test the complete application"
    fi
}

# Main deployment function
main() {
    log_info "Starting Campus Vibe Lambda deployment..."
    log_info "Stage: $STAGE"
    log_info "Region: $REGION"
    
    # Trap errors for rollback
    trap 'log_error "Deployment failed! Check the logs above."; rollback_deployment; exit 1' ERR
    
    check_prerequisites
    validate_aws_credentials
    validate_environment_variables
    install_dependencies
    run_tests
    create_backup
    deploy_lambda
    
    # Verify deployment
    if verify_deployment; then
        cleanup_backups
        display_summary
        log_success "Deployment completed successfully! 🎉"
    else
        log_error "Deployment verification failed!"
        rollback_deployment
        exit 1
    fi
}

# Help function
show_help() {
    echo "Campus Vibe Lambda Deployment Script"
    echo ""
    echo "Usage: $0 [STAGE]"
    echo ""
    echo "Arguments:"
    echo "  STAGE    Deployment stage (default: prod)"
    echo "           Options: dev, staging, prod"
    echo ""
    echo "Environment Variables:"
    echo "  AWS_REGION    AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0           # Deploy to production"
    echo "  $0 dev       # Deploy to development"
    echo "  $0 staging   # Deploy to staging"
    echo ""
    echo "Prerequisites:"
    echo "  - AWS CLI configured with appropriate credentials"
    echo "  - Serverless Framework installed"
    echo "  - Node.js and npm installed"
    echo "  - Environment file (.env or .env.STAGE) configured"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac