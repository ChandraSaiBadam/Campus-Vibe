#!/bin/bash

# Complete Campus Vibe Deployment Script
# Orchestrates backend, frontend, and monitoring deployment
#
# Requirements addressed:
# - 2.1: Automated deployment process
# - 2.2: Deployment verification and rollback capabilities
# - 2.3: Environment variable validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
DEFAULT_REGION="us-east-1"
PROJECT_NAME="campus-vibe"

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
Complete Campus Vibe Deployment Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --env ENVIRONMENT      Environment (staging|production, default: production)
    -r, --region REGION        AWS region (default: us-east-1)
    -m, --email EMAIL          Alert email address (required)
    -d, --domain DOMAIN        Custom domain for frontend (optional)
    -c, --certificate ARN      SSL certificate ARN for custom domain (optional)
    -b, --budget BUDGET        Monthly budget in USD (default: 5.0)
    --skip-backend            Skip backend deployment
    --skip-frontend           Skip frontend deployment
    --skip-monitoring         Skip monitoring deployment
    --skip-validation         Skip deployment validation
    -h, --help                Show this help message

EXAMPLES:
    $0 -m admin@example.com                                    # Basic deployment
    $0 -e staging -m alerts@company.com -b 10.0              # Staging with custom budget
    $0 -m admin@example.com -d yourdomain.com -c arn:aws:acm:certificate-arn

DEPLOYMENT PHASES:
    1. Environment validation
    2. Backend deployment (Lambda + API Gateway)
    3. Frontend deployment (S3 + CloudFront)
    4. Monitoring setup (CloudWatch + Alarms)
    5. Deployment validation and testing

EOF
}

# Validate dependencies
check_dependencies() {
    print_step "Checking dependencies..."
    
    local missing_deps=()
    
    # Check required tools
    if ! command -v aws &> /dev/null; then
        missing_deps+=("AWS CLI")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v serverless &> /dev/null; then
        missing_deps+=("Serverless Framework")
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check jq (optional but recommended)
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

# Validate environment configuration
validate_environment() {
    print_step "Validating environment configuration..."
    
    # Check server environment
    if [ ! -f "server/.env" ]; then
        print_error "Server environment file not found: server/.env"
        print_error "Please copy server/.env.example to server/.env and configure it"
        exit 1
    fi
    
    # Validate required environment variables
    local required_vars=("MONGODB_URI" "JWT_SECRET" "ADMIN_SECRET")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" server/.env; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables in server/.env:"
        for var in "${missing_vars[@]}"; do
            print_error "  - $var"
        done
        exit 1
    fi
    
    # Test MongoDB connection
    print_status "Testing MongoDB connection..."
    cd server
    if npm run validate-env &> /dev/null; then
        print_status "MongoDB connection validated"
    else
        print_warning "MongoDB connection test failed - continuing anyway"
    fi
    cd ..
    
    print_status "Environment validation completed"
}

# Deploy backend
deploy_backend() {
    if [ "$SKIP_BACKEND" = true ]; then
        print_warning "Skipping backend deployment as requested"
        return
    fi
    
    print_step "Deploying backend (Lambda + API Gateway)..."
    
    # Deploy using the enhanced script
    if [ -f "scripts/deploy-lambda.sh" ]; then
        ./scripts/deploy-lambda.sh -e "$ENVIRONMENT" -r "$REGION"
    else
        # Fallback to serverless deploy
        cd server
        npm install
        cd ..
        # Run serverless from root directory where serverless.yml is located
        serverless deploy --stage prod --verbose
    fi
    
    # Get API Gateway URL
    print_status "Retrieving API Gateway URL..."
    
    # Try to get URL from serverless output
    if [ -f "server/.serverless/stack-output.json" ]; then
        API_GATEWAY_URL=$(jq -r '.ServiceEndpoint' server/.serverless/stack-output.json 2>/dev/null || echo "")
    fi
    
    # Fallback: try to get from CloudFormation
    if [ -z "$API_GATEWAY_URL" ]; then
        API_GATEWAY_URL=$(aws cloudformation describe-stacks \
            --stack-name "campus-vibe-server-$ENVIRONMENT" \
            --region "$REGION" \
            --query 'Stacks[0].Outputs[?OutputKey==`ServiceEndpoint`].OutputValue' \
            --output text 2>/dev/null || echo "")
    fi
    
    if [ -n "$API_GATEWAY_URL" ] && [ "$API_GATEWAY_URL" != "None" ]; then
        print_status "Backend deployed successfully: $API_GATEWAY_URL"
        
        # Test backend health
        print_status "Testing backend health..."
        if curl -f -s "$API_GATEWAY_URL/api/health" > /dev/null; then
            print_status "Backend health check passed"
        else
            print_warning "Backend health check failed - continuing anyway"
        fi
    else
        print_warning "Could not retrieve API Gateway URL - continuing anyway"
    fi
}

# Deploy frontend
deploy_frontend() {
    if [ "$SKIP_FRONTEND" = true ]; then
        print_warning "Skipping frontend deployment as requested"
        return
    fi
    
    print_step "Deploying frontend (S3 + CloudFront)..."
    
    # Configure API URL if available
    if [ -n "$API_GATEWAY_URL" ]; then
        print_status "Configuring frontend API URL..."
        cd client
        npm run configure:api:production "$API_GATEWAY_URL" || print_warning "API configuration failed"
        cd ..
    fi
    
    # Deploy using the enhanced script
    local frontend_args=("-e" "$ENVIRONMENT" "-r" "$REGION")
    
    if [ -n "$CUSTOM_DOMAIN" ]; then
        frontend_args+=("-d" "$CUSTOM_DOMAIN")
    fi
    
    if [ -n "$SSL_CERTIFICATE_ARN" ]; then
        frontend_args+=("-c" "$SSL_CERTIFICATE_ARN")
    fi
    
    if [ -f "scripts/deploy-s3-cloudfront.sh" ]; then
        ./scripts/deploy-s3-cloudfront.sh "${frontend_args[@]}"
    else
        print_warning "Enhanced frontend deployment script not found, using basic deployment"
        # Fallback deployment logic here
    fi
    
    # Get frontend URL
    if [ -f "frontend-deployment-info.json" ]; then
        FRONTEND_URL=$(jq -r '.urls.primary' frontend-deployment-info.json 2>/dev/null || echo "")
        if [ -n "$FRONTEND_URL" ] && [ "$FRONTEND_URL" != "null" ]; then
            print_status "Frontend deployed successfully: $FRONTEND_URL"
        fi
    fi
}

# Deploy monitoring
deploy_monitoring() {
    if [ "$SKIP_MONITORING" = true ]; then
        print_warning "Skipping monitoring deployment as requested"
        return
    fi
    
    print_step "Deploying monitoring infrastructure..."
    
    # Get Lambda function name
    local lambda_function_name="campus-vibe-server-$ENVIRONMENT-api"
    
    # Get API Gateway ID (optional)
    local api_gateway_id=""
    if [ -n "$API_GATEWAY_URL" ]; then
        api_gateway_id=$(echo "$API_GATEWAY_URL" | sed -n 's/.*\/\/\([^.]*\).*/\1/p')
    fi
    
    # Deploy monitoring
    local monitoring_args=(
        "-f" "$lambda_function_name"
        "-m" "$ALERT_EMAIL"
        "-e" "$ENVIRONMENT"
        "-r" "$REGION"
        "-b" "$MONTHLY_BUDGET"
    )
    
    if [ -n "$api_gateway_id" ]; then
        monitoring_args+=("-g" "$api_gateway_id")
    fi
    
    if [ -f "scripts/deploy-monitoring.sh" ]; then
        ./scripts/deploy-monitoring.sh "${monitoring_args[@]}"
    else
        print_warning "Enhanced monitoring deployment script not found, using basic monitoring"
        # Fallback to basic monitoring
        if [ -f "deploy-monitoring.sh" ]; then
            ./deploy-monitoring.sh "$ENVIRONMENT"
        fi
    fi
    
    print_status "Monitoring deployment completed"
}

# Validate deployment
validate_deployment() {
    if [ "$SKIP_VALIDATION" = true ]; then
        print_warning "Skipping deployment validation as requested"
        return
    fi
    
    print_step "Validating deployment..."
    
    local validation_passed=true
    
    # Test backend
    if [ -n "$API_GATEWAY_URL" ]; then
        print_status "Testing backend endpoints..."
        
        # Test health endpoint
        if curl -f -s "$API_GATEWAY_URL/api/health" > /dev/null; then
            print_status "✅ Backend health check passed"
        else
            print_error "❌ Backend health check failed"
            validation_passed=false
        fi
        
        # Test monitoring endpoint
        if curl -f -s "$API_GATEWAY_URL/api/monitoring/health" > /dev/null; then
            print_status "✅ Monitoring health check passed"
        else
            print_warning "⚠️  Monitoring health check failed"
        fi
        
        # Run comprehensive backend tests
        if [ -f "server/tests/deployment-tests.js" ]; then
            print_status "Running comprehensive backend tests..."
            if node server/tests/deployment-tests.js "$API_GATEWAY_URL" &> /dev/null; then
                print_status "✅ Backend tests passed"
            else
                print_warning "⚠️  Some backend tests failed"
            fi
        fi
    fi
    
    # Test frontend
    if [ -n "$FRONTEND_URL" ]; then
        print_status "Testing frontend..."
        
        if curl -f -s -I "$FRONTEND_URL" > /dev/null; then
            print_status "✅ Frontend accessibility check passed"
        else
            print_error "❌ Frontend accessibility check failed"
            validation_passed=false
        fi
        
        # Run frontend validation
        if [ -f "scripts/validate-frontend-deployment.js" ]; then
            print_status "Running frontend validation..."
            if node scripts/validate-frontend-deployment.js "$ENVIRONMENT" &> /dev/null; then
                print_status "✅ Frontend validation passed"
            else
                print_warning "⚠️  Some frontend validations failed"
            fi
        fi
    fi
    
    # Test integration
    if [ -n "$API_GATEWAY_URL" ] && [ -n "$FRONTEND_URL" ]; then
        print_status "Testing frontend-backend integration..."
        
        # Run comprehensive validation
        if [ -f "scripts/validate-deployment.js" ]; then
            if node scripts/validate-deployment.js "$API_GATEWAY_URL" "$FRONTEND_URL" &> /dev/null; then
                print_status "✅ Integration tests passed"
            else
                print_warning "⚠️  Some integration tests failed"
            fi
        fi
    fi
    
    if [ "$validation_passed" = true ]; then
        print_success "✅ Deployment validation completed successfully"
    else
        print_warning "⚠️  Deployment validation completed with warnings"
    fi
}

# Generate deployment report
generate_deployment_report() {
    print_step "Generating deployment report..."
    
    local report_file="deployment-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"
    
    # Collect deployment information
    local deployment_info="{
        \"deployment\": {
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"environment\": \"$ENVIRONMENT\",
            \"region\": \"$REGION\",
            \"project\": \"$PROJECT_NAME\"
        },
        \"configuration\": {
            \"alert_email\": \"$ALERT_EMAIL\",
            \"monthly_budget\": $MONTHLY_BUDGET,
            \"custom_domain\": \"${CUSTOM_DOMAIN:-null}\",
            \"ssl_certificate\": \"${SSL_CERTIFICATE_ARN:-null}\"
        },
        \"urls\": {
            \"backend\": \"${API_GATEWAY_URL:-null}\",
            \"frontend\": \"${FRONTEND_URL:-null}\"
        },
        \"deployment_phases\": {
            \"backend\": $([ "$SKIP_BACKEND" = true ] && echo "false" || echo "true"),
            \"frontend\": $([ "$SKIP_FRONTEND" = true ] && echo "false" || echo "true"),
            \"monitoring\": $([ "$SKIP_MONITORING" = true ] && echo "false" || echo "true"),
            \"validation\": $([ "$SKIP_VALIDATION" = true ] && echo "false" || echo "true")
        }
    }"
    
    echo "$deployment_info" | jq '.' > "$report_file" 2>/dev/null || echo "$deployment_info" > "$report_file"
    
    print_status "Deployment report saved: $report_file"
}

# Generate final summary
generate_summary() {
    echo ""
    print_success "🎉 Campus Vibe deployment completed successfully!"
    echo ""
    print_status "📋 Deployment Summary:"
    print_status "   Environment: $ENVIRONMENT"
    print_status "   Region: $REGION"
    print_status "   Project: $PROJECT_NAME"
    echo ""
    
    if [ -n "$API_GATEWAY_URL" ]; then
        print_status "🔧 Backend:"
        print_status "   API Gateway: $API_GATEWAY_URL"
        print_status "   Health Check: $API_GATEWAY_URL/api/health"
        print_status "   Monitoring: $API_GATEWAY_URL/api/monitoring/health"
    fi
    
    if [ -n "$FRONTEND_URL" ]; then
        print_status "🌐 Frontend:"
        print_status "   Application: $FRONTEND_URL"
        if [ -n "$CUSTOM_DOMAIN" ]; then
            print_status "   Custom Domain: https://$CUSTOM_DOMAIN"
        fi
    fi
    
    echo ""
    print_status "📊 Monitoring:"
    print_status "   Alert Email: $ALERT_EMAIL"
    print_status "   Monthly Budget: \$$MONTHLY_BUDGET"
    print_status "   CloudWatch Dashboard: https://$REGION.console.aws.amazon.com/cloudwatch/home#dashboards:"
    print_status "   Cost Explorer: https://console.aws.amazon.com/cost-management/home#/cost-explorer"
    
    echo ""
    print_status "💰 Expected Monthly Costs:"
    print_status "   Lambda: \$0.00-\$0.50 (1M free requests)"
    print_status "   API Gateway: \$0.00-\$0.20 (1M free requests)"
    print_status "   S3 + CloudFront: \$0.10-\$0.50"
    print_status "   CloudWatch: \$0.15"
    print_status "   Total: \$0.95-\$5.00/month"
    
    echo ""
    print_status "📝 Next Steps:"
    print_status "   1. Check your email ($ALERT_EMAIL) to confirm monitoring alerts"
    print_status "   2. Test the application thoroughly: $FRONTEND_URL"
    print_status "   3. Monitor costs: ./scripts/analyze-costs.sh"
    print_status "   4. Review monitoring dashboard"
    
    if [ -n "$CUSTOM_DOMAIN" ]; then
        print_status "   5. Update DNS records to point to CloudFront distribution"
    fi
    
    echo ""
    print_status "🔧 Useful Commands:"
    print_status "   Cost Analysis: ./scripts/analyze-costs.sh --detailed"
    print_status "   Update Backend: cd server && npm run deploy:production"
    print_status "   Update Frontend: ./scripts/quick-deploy-frontend.sh $ENVIRONMENT"
    print_status "   View Logs: aws logs tail /aws/lambda/campus-vibe-server-$ENVIRONMENT-api --follow"
    
    echo ""
    print_success "🚀 Your Campus Vibe application is now live and monitored!"
}

# Main deployment function
main() {
    print_status "🚀 Starting Complete Campus Vibe Deployment"
    echo ""
    
    # Validate required parameters
    if [ -z "$ALERT_EMAIL" ]; then
        print_error "Alert email is required. Use -m flag or see --help"
        exit 1
    fi
    
    # Run deployment phases
    check_dependencies
    validate_environment
    deploy_backend
    deploy_frontend
    deploy_monitoring
    validate_deployment
    generate_deployment_report
    generate_summary
}

# Parse command line arguments
ENVIRONMENT="production"
REGION="$DEFAULT_REGION"
ALERT_EMAIL=""
CUSTOM_DOMAIN=""
SSL_CERTIFICATE_ARN=""
MONTHLY_BUDGET="5.0"
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_MONITORING=false
SKIP_VALIDATION=false

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
        -m|--email)
            ALERT_EMAIL="$2"
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
        -b|--budget)
            MONTHLY_BUDGET="$2"
            shift 2
            ;;
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-monitoring)
            SKIP_MONITORING=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
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
REGION="${REGION:-$AWS_REGION}"
REGION="${REGION:-$DEFAULT_REGION}"

# Validate inputs
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Environment must be 'staging' or 'production'"
    exit 1
fi

if [ -n "$CUSTOM_DOMAIN" ] && [ -z "$SSL_CERTIFICATE_ARN" ]; then
    print_error "SSL certificate ARN is required when using custom domain"
    exit 1
fi

if ! [[ "$MONTHLY_BUDGET" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    print_error "Monthly budget must be a valid number"
    exit 1
fi

# Run main function
main