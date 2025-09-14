#!/bin/bash

# Comprehensive Cost Analysis Script
# Analyzes AWS costs across all services used by Campus Vibe deployment
#
# Requirements addressed:
# - 3.4: Cost monitoring with detailed analysis and recommendations
# - 1.1: Minimize costs while maintaining performance

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
BUDGET_THRESHOLD=5.00
WARNING_THRESHOLD=3.50

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

print_metric() {
    echo -e "${BLUE}[METRIC]${NC} $1"
}

print_success() {
    echo -e "${PURPLE}[SUCCESS]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Comprehensive Cost Analysis Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -p, --period PERIOD        Analysis period (current-month|last-month|last-7-days|last-30-days, default: current-month)
    -r, --region REGION        AWS region (default: us-east-1)
    -b, --budget BUDGET        Budget threshold in USD (default: 5.00)
    -w, --warning WARNING      Warning threshold in USD (default: 3.50)
    -s, --service SERVICE      Analyze specific service (lambda|apigateway|s3|cloudfront|all, default: all)
    --detailed                Show detailed cost breakdown
    --recommendations         Show cost optimization recommendations
    --json                    Output in JSON format
    --csv                     Output in CSV format
    -h, --help                Show this help message

EXAMPLES:
    $0                                    # Analyze current month costs
    $0 --period last-30-days --detailed  # Detailed analysis for last 30 days
    $0 --service lambda --json           # Lambda costs in JSON format
    $0 --budget 10 --warning 7           # Custom budget thresholds

ANALYSIS PERIODS:
    current-month    Current calendar month to date
    last-month       Previous complete calendar month
    last-7-days      Last 7 days
    last-30-days     Last 30 days

SERVICES ANALYZED:
    lambda           AWS Lambda functions
    apigateway       API Gateway
    s3               S3 storage and requests
    cloudfront       CloudFront CDN
    all              All services (default)

EOF
}

# Get date range for analysis period
get_date_range() {
    case $PERIOD in
        "current-month")
            START_DATE=$(date -u +"%Y-%m-01")
            END_DATE=$(date -u +"%Y-%m-%d")
            PERIOD_DESCRIPTION="Current Month ($(date +"%B %Y"))"
            ;;
        "last-month")
            START_DATE=$(date -u -d "$(date +%Y-%m-01) -1 month" +"%Y-%m-01")
            END_DATE=$(date -u -d "$(date +%Y-%m-01) -1 day" +"%Y-%m-%d")
            PERIOD_DESCRIPTION="Last Month ($(date -d "$START_DATE" +"%B %Y"))"
            ;;
        "last-7-days")
            START_DATE=$(date -u -d "7 days ago" +"%Y-%m-%d")
            END_DATE=$(date -u +"%Y-%m-%d")
            PERIOD_DESCRIPTION="Last 7 Days"
            ;;
        "last-30-days")
            START_DATE=$(date -u -d "30 days ago" +"%Y-%m-%d")
            END_DATE=$(date -u +"%Y-%m-%d")
            PERIOD_DESCRIPTION="Last 30 Days"
            ;;
        *)
            print_error "Invalid period: $PERIOD"
            exit 1
            ;;
    esac
    
    print_status "Analysis Period: $PERIOD_DESCRIPTION ($START_DATE to $END_DATE)"
}

# Get cost data for a specific service
get_service_costs() {
    local service_name="$1"
    local service_filter="$2"
    
    local cost_data=$(aws ce get-cost-and-usage \
        --time-period Start="$START_DATE",End="$END_DATE" \
        --granularity DAILY \
        --metrics BlendedCost UnblendedCost UsageQuantity \
        --group-by Type=DIMENSION,Key=SERVICE \
        --filter "$service_filter" \
        --region us-east-1 \
        --output json 2>/dev/null || echo '{"ResultsByTime":[]}')
    
    echo "$cost_data"
}

# Analyze Lambda costs
analyze_lambda_costs() {
    print_status "Analyzing AWS Lambda costs..."
    
    local lambda_filter='{
        "Dimensions": {
            "Key": "SERVICE",
            "Values": ["AWS Lambda"]
        }
    }'
    
    local lambda_data=$(get_service_costs "AWS Lambda" "$lambda_filter")
    
    # Extract total cost
    local total_cost=$(echo "$lambda_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] == "AWS Lambda") | .Metrics.BlendedCost.Amount | tonumber] | add // 0
    ')
    
    # Get usage metrics
    local usage_data=$(aws ce get-cost-and-usage \
        --time-period Start="$START_DATE",End="$END_DATE" \
        --granularity MONTHLY \
        --metrics UsageQuantity \
        --group-by Type=DIMENSION,Key=USAGE_TYPE \
        --filter '{
            "Dimensions": {
                "Key": "SERVICE",
                "Values": ["AWS Lambda"]
            }
        }' \
        --region us-east-1 \
        --output json 2>/dev/null || echo '{"ResultsByTime":[]}')
    
    # Extract request count and GB-seconds
    local request_usage=$(echo "$usage_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] | contains("Request")) | .Metrics.UsageQuantity.Amount | tonumber] | add // 0
    ')
    
    local compute_usage=$(echo "$usage_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] | contains("GB-Second")) | .Metrics.UsageQuantity.Amount | tonumber] | add // 0
    ')
    
    # Calculate free tier utilization
    local free_tier_requests=1000000  # 1M requests per month
    local free_tier_gb_seconds=400000  # 400K GB-seconds per month
    
    local request_utilization=0
    local compute_utilization=0
    
    if (( $(echo "$request_usage > 0" | bc -l) )); then
        request_utilization=$(echo "scale=1; $request_usage * 100 / $free_tier_requests" | bc -l)
    fi
    
    if (( $(echo "$compute_usage > 0" | bc -l) )); then
        compute_utilization=$(echo "scale=1; $compute_usage * 100 / $free_tier_gb_seconds" | bc -l)
    fi
    
    # Store results
    LAMBDA_COST="$total_cost"
    LAMBDA_REQUESTS="$request_usage"
    LAMBDA_GB_SECONDS="$compute_usage"
    LAMBDA_REQUEST_UTILIZATION="$request_utilization"
    LAMBDA_COMPUTE_UTILIZATION="$compute_utilization"
    
    print_metric "Lambda Total Cost: \$$(printf "%.4f" "$total_cost")"
    print_metric "Lambda Requests: $(printf "%.0f" "$request_usage")"
    print_metric "Lambda GB-Seconds: $(printf "%.2f" "$compute_usage")"
    print_metric "Free Tier Utilization - Requests: ${request_utilization}%"
    print_metric "Free Tier Utilization - Compute: ${compute_utilization}%"
}

# Analyze API Gateway costs
analyze_apigateway_costs() {
    print_status "Analyzing API Gateway costs..."
    
    local apigateway_filter='{
        "Dimensions": {
            "Key": "SERVICE",
            "Values": ["Amazon API Gateway"]
        }
    }'
    
    local apigateway_data=$(get_service_costs "Amazon API Gateway" "$apigateway_filter")
    
    # Extract total cost
    local total_cost=$(echo "$apigateway_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] == "Amazon API Gateway") | .Metrics.BlendedCost.Amount | tonumber] | add // 0
    ')
    
    # Get usage metrics
    local usage_data=$(aws ce get-cost-and-usage \
        --time-period Start="$START_DATE",End="$END_DATE" \
        --granularity MONTHLY \
        --metrics UsageQuantity \
        --group-by Type=DIMENSION,Key=USAGE_TYPE \
        --filter '{
            "Dimensions": {
                "Key": "SERVICE",
                "Values": ["Amazon API Gateway"]
            }
        }' \
        --region us-east-1 \
        --output json 2>/dev/null || echo '{"ResultsByTime":[]}')
    
    # Extract request count
    local request_usage=$(echo "$usage_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] | contains("ApiCalls")) | .Metrics.UsageQuantity.Amount | tonumber] | add // 0
    ')
    
    # Calculate free tier utilization
    local free_tier_requests=1000000  # 1M requests per month
    local request_utilization=0
    
    if (( $(echo "$request_usage > 0" | bc -l) )); then
        request_utilization=$(echo "scale=1; $request_usage * 100 / $free_tier_requests" | bc -l)
    fi
    
    # Store results
    APIGATEWAY_COST="$total_cost"
    APIGATEWAY_REQUESTS="$request_usage"
    APIGATEWAY_REQUEST_UTILIZATION="$request_utilization"
    
    print_metric "API Gateway Total Cost: \$$(printf "%.4f" "$total_cost")"
    print_metric "API Gateway Requests: $(printf "%.0f" "$request_usage")"
    print_metric "Free Tier Utilization - Requests: ${request_utilization}%"
}

# Analyze S3 costs
analyze_s3_costs() {
    print_status "Analyzing S3 costs..."
    
    local s3_filter='{
        "Dimensions": {
            "Key": "SERVICE",
            "Values": ["Amazon Simple Storage Service"]
        }
    }'
    
    local s3_data=$(get_service_costs "Amazon Simple Storage Service" "$s3_filter")
    
    # Extract total cost
    local total_cost=$(echo "$s3_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] == "Amazon Simple Storage Service") | .Metrics.BlendedCost.Amount | tonumber] | add // 0
    ')
    
    # Get detailed usage breakdown
    local usage_data=$(aws ce get-cost-and-usage \
        --time-period Start="$START_DATE",End="$END_DATE" \
        --granularity MONTHLY \
        --metrics BlendedCost UsageQuantity \
        --group-by Type=DIMENSION,Key=USAGE_TYPE \
        --filter '{
            "Dimensions": {
                "Key": "SERVICE",
                "Values": ["Amazon Simple Storage Service"]
            }
        }' \
        --region us-east-1 \
        --output json 2>/dev/null || echo '{"ResultsByTime":[]}')
    
    # Extract storage and request costs
    local storage_cost=$(echo "$usage_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] | contains("TimedStorage")) | .Metrics.BlendedCost.Amount | tonumber] | add // 0
    ')
    
    local request_cost=$(echo "$usage_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] | contains("Requests")) | .Metrics.BlendedCost.Amount | tonumber] | add // 0
    ')
    
    local storage_gb=$(echo "$usage_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] | contains("TimedStorage")) | .Metrics.UsageQuantity.Amount | tonumber] | add // 0
    ')
    
    # Convert to GB (usage is in GB-months)
    storage_gb=$(echo "scale=2; $storage_gb" | bc -l)
    
    # Store results
    S3_COST="$total_cost"
    S3_STORAGE_COST="$storage_cost"
    S3_REQUEST_COST="$request_cost"
    S3_STORAGE_GB="$storage_gb"
    
    print_metric "S3 Total Cost: \$$(printf "%.4f" "$total_cost")"
    print_metric "S3 Storage Cost: \$$(printf "%.4f" "$storage_cost")"
    print_metric "S3 Request Cost: \$$(printf "%.4f" "$request_cost")"
    print_metric "S3 Storage Usage: $(printf "%.2f" "$storage_gb") GB"
}

# Analyze CloudFront costs
analyze_cloudfront_costs() {
    print_status "Analyzing CloudFront costs..."
    
    local cloudfront_filter='{
        "Dimensions": {
            "Key": "SERVICE",
            "Values": ["Amazon CloudFront"]
        }
    }'
    
    local cloudfront_data=$(get_service_costs "Amazon CloudFront" "$cloudfront_filter")
    
    # Extract total cost
    local total_cost=$(echo "$cloudfront_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] == "Amazon CloudFront") | .Metrics.BlendedCost.Amount | tonumber] | add // 0
    ')
    
    # Get usage metrics
    local usage_data=$(aws ce get-cost-and-usage \
        --time-period Start="$START_DATE",End="$END_DATE" \
        --granularity MONTHLY \
        --metrics UsageQuantity \
        --group-by Type=DIMENSION,Key=USAGE_TYPE \
        --filter '{
            "Dimensions": {
                "Key": "SERVICE",
                "Values": ["Amazon CloudFront"]
            }
        }' \
        --region us-east-1 \
        --output json 2>/dev/null || echo '{"ResultsByTime":[]}')
    
    # Extract data transfer and request metrics
    local data_transfer=$(echo "$usage_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] | contains("DataTransfer")) | .Metrics.UsageQuantity.Amount | tonumber] | add // 0
    ')
    
    local requests=$(echo "$usage_data" | jq -r '
        [.ResultsByTime[].Groups[]? | select(.Keys[0] | contains("Requests")) | .Metrics.UsageQuantity.Amount | tonumber] | add // 0
    ')
    
    # Store results
    CLOUDFRONT_COST="$total_cost"
    CLOUDFRONT_DATA_TRANSFER="$data_transfer"
    CLOUDFRONT_REQUESTS="$requests"
    
    print_metric "CloudFront Total Cost: \$$(printf "%.4f" "$total_cost")"
    print_metric "CloudFront Data Transfer: $(printf "%.2f" "$data_transfer") GB"
    print_metric "CloudFront Requests: $(printf "%.0f" "$requests")"
}

# Calculate total costs and projections
calculate_totals() {
    print_status "Calculating totals and projections..."
    
    # Calculate total cost
    TOTAL_COST=$(echo "$LAMBDA_COST + $APIGATEWAY_COST + $S3_COST + $CLOUDFRONT_COST" | bc -l)
    
    # Calculate monthly projection based on period
    case $PERIOD in
        "current-month")
            local days_in_month=$(date -d "$(date +%Y-%m-01) +1 month -1 day" +%d)
            local current_day=$(date +%d)
            PROJECTED_MONTHLY_COST=$(echo "scale=4; $TOTAL_COST * $days_in_month / $current_day" | bc -l)
            ;;
        "last-month")
            PROJECTED_MONTHLY_COST="$TOTAL_COST"
            ;;
        "last-7-days")
            PROJECTED_MONTHLY_COST=$(echo "scale=4; $TOTAL_COST * 30 / 7" | bc -l)
            ;;
        "last-30-days")
            PROJECTED_MONTHLY_COST="$TOTAL_COST"
            ;;
    esac
    
    # Calculate budget utilization
    BUDGET_UTILIZATION=$(echo "scale=1; $PROJECTED_MONTHLY_COST * 100 / $BUDGET_THRESHOLD" | bc -l)
    
    print_metric "Total Cost ($PERIOD_DESCRIPTION): \$$(printf "%.4f" "$TOTAL_COST")"
    print_metric "Projected Monthly Cost: \$$(printf "%.4f" "$PROJECTED_MONTHLY_COST")"
    print_metric "Budget Utilization: ${BUDGET_UTILIZATION}%"
}

# Generate cost optimization recommendations
generate_recommendations() {
    if [ "$SHOW_RECOMMENDATIONS" != true ]; then
        return
    fi
    
    print_status "Cost Optimization Recommendations:"
    echo ""
    
    # Lambda recommendations
    if (( $(echo "$LAMBDA_REQUEST_UTILIZATION > 90" | bc -l) )); then
        print_warning "  🔸 Lambda: Free tier request limit nearly reached (${LAMBDA_REQUEST_UTILIZATION}%)"
        print_status "    • Consider optimizing API calls to reduce request count"
        print_status "    • Implement request batching where possible"
    fi
    
    if (( $(echo "$LAMBDA_COMPUTE_UTILIZATION > 90" | bc -l) )); then
        print_warning "  🔸 Lambda: Free tier compute limit nearly reached (${LAMBDA_COMPUTE_UTILIZATION}%)"
        print_status "    • Optimize function memory allocation"
        print_status "    • Reduce function execution time"
        print_status "    • Consider using ARM64 architecture for better price/performance"
    fi
    
    # API Gateway recommendations
    if (( $(echo "$APIGATEWAY_REQUEST_UTILIZATION > 90" | bc -l) )); then
        print_warning "  🔸 API Gateway: Free tier limit nearly reached (${APIGATEWAY_REQUEST_UTILIZATION}%)"
        print_status "    • Implement caching to reduce backend calls"
        print_status "    • Consider request/response compression"
    fi
    
    # S3 recommendations
    if (( $(echo "$S3_STORAGE_GB > 1" | bc -l) )); then
        print_status "  🔸 S3: Consider storage optimization"
        print_status "    • Implement lifecycle policies for old files"
        print_status "    • Use S3 Intelligent Tiering for automatic cost optimization"
        print_status "    • Compress static assets before upload"
    fi
    
    # CloudFront recommendations
    if (( $(echo "$CLOUDFRONT_COST > 1" | bc -l) )); then
        print_status "  🔸 CloudFront: Optimize CDN usage"
        print_status "    • Review cache hit ratio and optimize cache headers"
        print_status "    • Consider using PriceClass_100 for cost savings"
        print_status "    • Implement proper compression for all assets"
    fi
    
    # Budget recommendations
    if (( $(echo "$BUDGET_UTILIZATION > 95" | bc -l) )); then
        print_error "  🚨 Budget: Critical - Projected cost exceeds 95% of budget"
        print_status "    • Immediate cost reduction measures needed"
        print_status "    • Review all services for optimization opportunities"
    elif (( $(echo "$BUDGET_UTILIZATION > 80" | bc -l) )); then
        print_warning "  ⚠️  Budget: Warning - Projected cost exceeds 80% of budget"
        print_status "    • Monitor costs closely"
        print_status "    • Implement cost optimization measures"
    else
        print_success "  ✅ Budget: On track - Projected cost is within budget"
    fi
    
    echo ""
    print_status "General Recommendations:"
    print_status "  • Set up CloudWatch billing alarms for proactive monitoring"
    print_status "  • Review AWS Cost Explorer regularly for trends"
    print_status "  • Consider Reserved Capacity for predictable workloads"
    print_status "  • Use AWS Cost Anomaly Detection for unusual spending patterns"
    print_status "  • Implement tagging strategy for better cost allocation"
}

# Output results in JSON format
output_json() {
    if [ "$JSON_OUTPUT" != true ]; then
        return
    fi
    
    local json_output="{
        \"analysis\": {
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"period\": \"$PERIOD\",
            \"period_description\": \"$PERIOD_DESCRIPTION\",
            \"date_range\": {
                \"start\": \"$START_DATE\",
                \"end\": \"$END_DATE\"
            }
        },
        \"costs\": {
            \"lambda\": {
                \"total_cost\": $LAMBDA_COST,
                \"requests\": $LAMBDA_REQUESTS,
                \"gb_seconds\": $LAMBDA_GB_SECONDS,
                \"free_tier_utilization\": {
                    \"requests\": $LAMBDA_REQUEST_UTILIZATION,
                    \"compute\": $LAMBDA_COMPUTE_UTILIZATION
                }
            },
            \"api_gateway\": {
                \"total_cost\": $APIGATEWAY_COST,
                \"requests\": $APIGATEWAY_REQUESTS,
                \"free_tier_utilization\": $APIGATEWAY_REQUEST_UTILIZATION
            },
            \"s3\": {
                \"total_cost\": $S3_COST,
                \"storage_cost\": $S3_STORAGE_COST,
                \"request_cost\": $S3_REQUEST_COST,
                \"storage_gb\": $S3_STORAGE_GB
            },
            \"cloudfront\": {
                \"total_cost\": $CLOUDFRONT_COST,
                \"data_transfer_gb\": $CLOUDFRONT_DATA_TRANSFER,
                \"requests\": $CLOUDFRONT_REQUESTS
            },
            \"total\": {
                \"period_cost\": $TOTAL_COST,
                \"projected_monthly_cost\": $PROJECTED_MONTHLY_COST,
                \"budget_threshold\": $BUDGET_THRESHOLD,
                \"budget_utilization\": $BUDGET_UTILIZATION
            }
        }
    }"
    
    echo "$json_output" | jq '.'
}

# Output results in CSV format
output_csv() {
    if [ "$CSV_OUTPUT" != true ]; then
        return
    fi
    
    echo "Service,Cost,Usage,Unit,Free Tier Utilization"
    echo "Lambda,$LAMBDA_COST,$LAMBDA_REQUESTS,Requests,${LAMBDA_REQUEST_UTILIZATION}%"
    echo "Lambda Compute,$LAMBDA_COST,$LAMBDA_GB_SECONDS,GB-Seconds,${LAMBDA_COMPUTE_UTILIZATION}%"
    echo "API Gateway,$APIGATEWAY_COST,$APIGATEWAY_REQUESTS,Requests,${APIGATEWAY_REQUEST_UTILIZATION}%"
    echo "S3 Storage,$S3_STORAGE_COST,$S3_STORAGE_GB,GB,N/A"
    echo "S3 Requests,$S3_REQUEST_COST,N/A,Requests,N/A"
    echo "CloudFront,$CLOUDFRONT_COST,$CLOUDFRONT_DATA_TRANSFER,GB,N/A"
    echo "Total,$TOTAL_COST,N/A,N/A,${BUDGET_UTILIZATION}%"
}

# Main analysis function
main() {
    print_status "🔍 Starting Comprehensive Cost Analysis"
    echo ""
    
    # Check dependencies
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_error "jq is required for JSON processing"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        print_error "bc is required for calculations"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured"
        exit 1
    fi
    
    get_date_range
    
    # Initialize cost variables
    LAMBDA_COST=0
    APIGATEWAY_COST=0
    S3_COST=0
    CLOUDFRONT_COST=0
    LAMBDA_REQUESTS=0
    LAMBDA_GB_SECONDS=0
    LAMBDA_REQUEST_UTILIZATION=0
    LAMBDA_COMPUTE_UTILIZATION=0
    APIGATEWAY_REQUESTS=0
    APIGATEWAY_REQUEST_UTILIZATION=0
    S3_STORAGE_COST=0
    S3_REQUEST_COST=0
    S3_STORAGE_GB=0
    CLOUDFRONT_DATA_TRANSFER=0
    CLOUDFRONT_REQUESTS=0
    
    # Analyze services based on selection
    case $SERVICE in
        "lambda")
            analyze_lambda_costs
            ;;
        "apigateway")
            analyze_apigateway_costs
            ;;
        "s3")
            analyze_s3_costs
            ;;
        "cloudfront")
            analyze_cloudfront_costs
            ;;
        "all")
            analyze_lambda_costs
            echo ""
            analyze_apigateway_costs
            echo ""
            analyze_s3_costs
            echo ""
            analyze_cloudfront_costs
            ;;
    esac
    
    echo ""
    calculate_totals
    echo ""
    generate_recommendations
    echo ""
    output_json
    output_csv
}

# Parse command line arguments
PERIOD="current-month"
REGION="$DEFAULT_REGION"
SERVICE="all"
SHOW_DETAILED=false
SHOW_RECOMMENDATIONS=false
JSON_OUTPUT=false
CSV_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--period)
            PERIOD="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -b|--budget)
            BUDGET_THRESHOLD="$2"
            shift 2
            ;;
        -w|--warning)
            WARNING_THRESHOLD="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        --detailed)
            SHOW_DETAILED=true
            shift
            ;;
        --recommendations)
            SHOW_RECOMMENDATIONS=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --csv)
            CSV_OUTPUT=true
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

# Validate inputs
if [[ ! "$PERIOD" =~ ^(current-month|last-month|last-7-days|last-30-days)$ ]]; then
    print_error "Invalid period: $PERIOD"
    exit 1
fi

if [[ ! "$SERVICE" =~ ^(lambda|apigateway|s3|cloudfront|all)$ ]]; then
    print_error "Invalid service: $SERVICE"
    exit 1
fi

# Run main function
main