#!/bin/bash

# Frontend Cost Monitoring Script
# Monitors S3 and CloudFront costs to ensure budget compliance
#
# Requirements addressed:
# - 1.1: Minimize AWS costs while maintaining performance
# - 3.4: Cost monitoring alerts and notifications

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

print_metric() {
    echo -e "${BLUE}[METRIC]${NC} $1"
}

# Configuration
ENVIRONMENT="${1:-production}"
REGION="${AWS_REGION:-us-east-1}"
BUDGET_THRESHOLD=5.00  # $5 monthly budget
WARNING_THRESHOLD=3.50  # $3.50 warning threshold

# Help function
show_help() {
    cat << EOF
Frontend Cost Monitoring Script

USAGE:
    $0 [ENVIRONMENT] [OPTIONS]

ARGUMENTS:
    ENVIRONMENT    Environment to monitor (staging|production, default: production)

OPTIONS:
    --budget AMOUNT       Monthly budget threshold in USD (default: 5.00)
    --warning AMOUNT      Warning threshold in USD (default: 3.50)
    --detailed           Show detailed cost breakdown
    --json               Output in JSON format
    -h, --help           Show this help message

EXAMPLES:
    $0                           # Monitor production with default thresholds
    $0 staging --detailed        # Monitor staging with detailed breakdown
    $0 --budget 10 --warning 7   # Custom budget thresholds

EOF
}

# Get deployment info
get_deployment_info() {
    local deployment_info_file="frontend-deployment-info.json"
    
    if [ ! -f "$deployment_info_file" ]; then
        print_error "Deployment info file not found: $deployment_info_file"
        print_error "Please run deploy-s3-cloudfront.sh first"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_error "jq is required for this script. Please install it first."
        exit 1
    fi
    
    S3_BUCKET=$(jq -r '.infrastructure.s3_bucket' "$deployment_info_file")
    CLOUDFRONT_DISTRIBUTION_ID=$(jq -r '.infrastructure.cloudfront_distribution_id' "$deployment_info_file")
    STACK_NAME=$(jq -r '.deployment.stack_name' "$deployment_info_file")
    
    if [ "$S3_BUCKET" = "null" ] || [ -z "$S3_BUCKET" ]; then
        print_error "Could not extract deployment info"
        exit 1
    fi
    
    print_status "Monitoring costs for:"
    print_status "  S3 Bucket: $S3_BUCKET"
    print_status "  CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION_ID"
    print_status "  Stack: $STACK_NAME"
}

# Get current month date range
get_current_month_range() {
    START_DATE=$(date -u +"%Y-%m-01")
    END_DATE=$(date -u +"%Y-%m-%d")
    
    print_status "Cost period: $START_DATE to $END_DATE"
}

# Get S3 costs
get_s3_costs() {
    print_status "Retrieving S3 costs..."
    
    # Get S3 storage costs
    local s3_storage_cost=$(aws ce get-cost-and-usage \
        --time-period Start="$START_DATE",End="$END_DATE" \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --group-by Type=DIMENSION,Key=SERVICE \
        --filter '{
            "Dimensions": {
                "Key": "SERVICE",
                "Values": ["Amazon Simple Storage Service"]
            }
        }' \
        --region us-east-1 \
        --query 'ResultsByTime[0].Groups[0].Metrics.BlendedCost.Amount' \
        --output text 2>/dev/null || echo "0")
    
    # Get S3 request costs
    local s3_request_cost=$(aws ce get-cost-and-usage \
        --time-period Start="$START_DATE",End="$END_DATE" \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --group-by Type=DIMENSION,Key=USAGE_TYPE \
        --filter '{
            "And": [
                {
                    "Dimensions": {
                        "Key": "SERVICE",
                        "Values": ["Amazon Simple Storage Service"]
                    }
                },
                {
                    "Dimensions": {
                        "Key": "USAGE_TYPE",
                        "Values": ["Requests-Tier1", "Requests-Tier2"]
                    }
                }
            ]
        }' \
        --region us-east-1 \
        --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
        --output text 2>/dev/null || echo "0")
    
    S3_TOTAL_COST=$(echo "$s3_storage_cost + $s3_request_cost" | bc -l 2>/dev/null || echo "0")
    
    print_metric "S3 Storage Cost: \$$(printf "%.2f" "$s3_storage_cost")"
    print_metric "S3 Request Cost: \$$(printf "%.2f" "$s3_request_cost")"
    print_metric "S3 Total Cost: \$$(printf "%.2f" "$S3_TOTAL_COST")"
}

# Get CloudFront costs
get_cloudfront_costs() {
    print_status "Retrieving CloudFront costs..."
    
    local cloudfront_cost=$(aws ce get-cost-and-usage \
        --time-period Start="$START_DATE",End="$END_DATE" \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --group-by Type=DIMENSION,Key=SERVICE \
        --filter '{
            "Dimensions": {
                "Key": "SERVICE",
                "Values": ["Amazon CloudFront"]
            }
        }' \
        --region us-east-1 \
        --query 'ResultsByTime[0].Groups[0].Metrics.BlendedCost.Amount' \
        --output text 2>/dev/null || echo "0")
    
    CLOUDFRONT_TOTAL_COST="$cloudfront_cost"
    
    print_metric "CloudFront Cost: \$$(printf "%.2f" "$CLOUDFRONT_TOTAL_COST")"
}

# Get detailed usage metrics
get_usage_metrics() {
    if [ "$DETAILED" != true ]; then
        return
    fi
    
    print_status "Retrieving detailed usage metrics..."
    
    # S3 storage usage
    local s3_storage_gb=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/S3 \
        --metric-name BucketSizeBytes \
        --dimensions Name=BucketName,Value="$S3_BUCKET" Name=StorageType,Value=StandardStorage \
        --start-time "$(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 86400 \
        --statistics Average \
        --region "$REGION" \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$s3_storage_gb" != "None" ] && [ "$s3_storage_gb" != "0" ]; then
        s3_storage_gb=$(echo "scale=2; $s3_storage_gb / 1024 / 1024 / 1024" | bc -l)
        print_metric "S3 Storage Usage: ${s3_storage_gb} GB"
    fi
    
    # S3 request count
    local s3_requests=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/S3 \
        --metric-name NumberOfObjects \
        --dimensions Name=BucketName,Value="$S3_BUCKET" Name=StorageType,Value=AllStorageTypes \
        --start-time "$(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 86400 \
        --statistics Average \
        --region "$REGION" \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$s3_requests" != "None" ] && [ "$s3_requests" != "0" ]; then
        print_metric "S3 Object Count: $(printf "%.0f" "$s3_requests")"
    fi
    
    # CloudFront requests
    local cf_requests=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/CloudFront \
        --metric-name Requests \
        --dimensions Name=DistributionId,Value="$CLOUDFRONT_DISTRIBUTION_ID" \
        --start-time "$(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 86400 \
        --statistics Sum \
        --region us-east-1 \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$cf_requests" != "None" ] && [ "$cf_requests" != "0" ]; then
        print_metric "CloudFront Requests (24h): $(printf "%.0f" "$cf_requests")"
    fi
    
    # CloudFront data transfer
    local cf_bytes=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/CloudFront \
        --metric-name BytesDownloaded \
        --dimensions Name=DistributionId,Value="$CLOUDFRONT_DISTRIBUTION_ID" \
        --start-time "$(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 86400 \
        --statistics Sum \
        --region us-east-1 \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$cf_bytes" != "None" ] && [ "$cf_bytes" != "0" ]; then
        local cf_gb=$(echo "scale=2; $cf_bytes / 1024 / 1024 / 1024" | bc -l)
        print_metric "CloudFront Data Transfer (24h): ${cf_gb} GB"
    fi
}

# Calculate total costs and check thresholds
analyze_costs() {
    print_status "Analyzing costs..."
    
    TOTAL_COST=$(echo "$S3_TOTAL_COST + $CLOUDFRONT_TOTAL_COST" | bc -l)
    
    # Project monthly cost based on current usage
    local days_in_month=$(date -d "$(date +%Y-%m-01) +1 month -1 day" +%d)
    local current_day=$(date +%d)
    local projected_monthly_cost=$(echo "scale=2; $TOTAL_COST * $days_in_month / $current_day" | bc -l)
    
    print_metric "Current Month Cost: \$$(printf "%.2f" "$TOTAL_COST")"
    print_metric "Projected Monthly Cost: \$$(printf "%.2f" "$projected_monthly_cost")"
    print_metric "Budget Threshold: \$$(printf "%.2f" "$BUDGET_THRESHOLD")"
    print_metric "Warning Threshold: \$$(printf "%.2f" "$WARNING_THRESHOLD")"
    
    # Check thresholds
    local cost_status="OK"
    local cost_percentage=$(echo "scale=1; $projected_monthly_cost * 100 / $BUDGET_THRESHOLD" | bc -l)
    
    if (( $(echo "$projected_monthly_cost > $BUDGET_THRESHOLD" | bc -l) )); then
        print_error "🚨 BUDGET EXCEEDED: Projected cost (\$$(printf "%.2f" "$projected_monthly_cost")) exceeds budget (\$$(printf "%.2f" "$BUDGET_THRESHOLD"))"
        cost_status="OVER_BUDGET"
    elif (( $(echo "$projected_monthly_cost > $WARNING_THRESHOLD" | bc -l) )); then
        print_warning "⚠️  WARNING: Projected cost (\$$(printf "%.2f" "$projected_monthly_cost")) exceeds warning threshold (\$$(printf "%.2f" "$WARNING_THRESHOLD"))"
        cost_status="WARNING"
    else
        print_status "✅ BUDGET OK: Projected cost is within budget ($(printf "%.1f" "$cost_percentage")% of budget)"
    fi
    
    # Store results for JSON output
    COST_ANALYSIS="{
        \"current_cost\": $TOTAL_COST,
        \"projected_monthly_cost\": $projected_monthly_cost,
        \"budget_threshold\": $BUDGET_THRESHOLD,
        \"warning_threshold\": $WARNING_THRESHOLD,
        \"cost_percentage\": $cost_percentage,
        \"status\": \"$cost_status\",
        \"s3_cost\": $S3_TOTAL_COST,
        \"cloudfront_cost\": $CLOUDFRONT_TOTAL_COST
    }"
}

# Generate cost optimization recommendations
generate_recommendations() {
    print_status "Cost Optimization Recommendations:"
    
    # S3 recommendations
    if (( $(echo "$S3_TOTAL_COST > 1.0" | bc -l) )); then
        print_warning "  • Consider S3 Intelligent Tiering for automatic cost optimization"
        print_warning "  • Review S3 lifecycle policies to transition old files to cheaper storage classes"
    fi
    
    # CloudFront recommendations
    if (( $(echo "$CLOUDFRONT_TOTAL_COST > 2.0" | bc -l) )); then
        print_warning "  • Consider using PriceClass_100 to limit to cheaper edge locations"
        print_warning "  • Review cache hit ratio and optimize cache headers"
    fi
    
    # General recommendations
    print_status "  • Monitor costs weekly to catch trends early"
    print_status "  • Use CloudWatch alarms for automated cost alerts"
    print_status "  • Consider Reserved Capacity for predictable workloads"
}

# Output JSON format
output_json() {
    if [ "$JSON_OUTPUT" != true ]; then
        return
    fi
    
    local json_output="{
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"environment\": \"$ENVIRONMENT\",
        \"period\": {
            \"start\": \"$START_DATE\",
            \"end\": \"$END_DATE\"
        },
        \"infrastructure\": {
            \"s3_bucket\": \"$S3_BUCKET\",
            \"cloudfront_distribution_id\": \"$CLOUDFRONT_DISTRIBUTION_ID\",
            \"stack_name\": \"$STACK_NAME\"
        },
        \"costs\": $COST_ANALYSIS
    }"
    
    echo "$json_output" | jq '.'
}

# Main function
main() {
    print_status "🔍 Frontend Cost Monitoring - $ENVIRONMENT Environment"
    echo ""
    
    get_deployment_info
    get_current_month_range
    get_s3_costs
    get_cloudfront_costs
    get_usage_metrics
    analyze_costs
    
    echo ""
    generate_recommendations
    
    echo ""
    output_json
}

# Parse command line arguments
DETAILED=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --budget)
            BUDGET_THRESHOLD="$2"
            shift 2
            ;;
        --warning)
            WARNING_THRESHOLD="$2"
            shift 2
            ;;
        --detailed)
            DETAILED=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            ENVIRONMENT="$1"
            shift
            ;;
    esac
done

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Environment must be 'staging' or 'production'"
    exit 1
fi

# Check for bc command (for calculations)
if ! command -v bc &> /dev/null; then
    print_error "bc command is required for cost calculations. Please install it first."
    exit 1
fi

# Run main function
main