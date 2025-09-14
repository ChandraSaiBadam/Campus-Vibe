#!/bin/bash

# Deploy Monitoring Infrastructure for Campus Vibe
# This script sets up CloudWatch dashboards, alarms, and SNS topics for monitoring

set -e

# Configuration
SERVICE_NAME="campus-vibe-server"
STAGE="${1:-prod}"
REGION="${AWS_REGION:-us-east-1}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"

echo "🔍 Deploying monitoring infrastructure for $SERVICE_NAME-$STAGE"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed for JSON processing
if ! command -v jq &> /dev/null; then
    echo "❌ jq is not installed. Please install it for JSON processing."
    exit 1
fi

# Validate AWS credentials
echo "🔐 Validating AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Get the deployed Lambda function name
FUNCTION_NAME="$SERVICE_NAME-$STAGE-api"
echo "📋 Lambda function: $FUNCTION_NAME"

# Check if Lambda function exists
if ! aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &> /dev/null; then
    echo "❌ Lambda function $FUNCTION_NAME not found. Please deploy the application first."
    exit 1
fi

# Create SNS topic for alerts
echo "📢 Creating SNS topic for alerts..."
SNS_TOPIC_NAME="$SERVICE_NAME-$STAGE-alerts"
SNS_TOPIC_ARN=$(aws sns create-topic \
    --name "$SNS_TOPIC_NAME" \
    --region "$REGION" \
    --query 'TopicArn' \
    --output text)

echo "✅ SNS Topic created: $SNS_TOPIC_ARN"

# Subscribe email to SNS topic
echo "📧 Subscribing $ALERT_EMAIL to SNS topic..."
aws sns subscribe \
    --topic-arn "$SNS_TOPIC_ARN" \
    --protocol email \
    --notification-endpoint "$ALERT_EMAIL" \
    --region "$REGION" > /dev/null

echo "✅ Email subscription created (check your email to confirm)"

# Create CloudWatch dashboard
echo "📊 Creating CloudWatch dashboard..."
DASHBOARD_NAME="$SERVICE_NAME-$STAGE-dashboard"

# Generate dashboard configuration
DASHBOARD_BODY=$(cat << EOF
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", "FunctionName", "$FUNCTION_NAME"],
          [".", "Errors", ".", "."],
          [".", "Duration", ".", "."],
          [".", "Throttles", ".", "."]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$REGION",
        "title": "Lambda Performance Metrics",
        "period": 300,
        "stat": "Sum"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["CampusVibe/Application", "ApiRequests", "Method", "GET"],
          ["...", "POST"],
          [".", "ApiErrors", "StatusClass", "4xx"],
          ["...", "5xx"]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$REGION",
        "title": "Application Metrics",
        "period": 300,
        "stat": "Sum"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 24,
      "height": 6,
      "properties": {
        "metrics": [
          ["CampusVibe/Application", "EstimatedMonthlyCost", "Service", "CampusVibe"],
          [".", "BudgetUtilization", ".", "."],
          [".", "LambdaRequestsFreeTierUtilization", ".", "."],
          [".", "ApiGatewayFreeTierUtilization", ".", "."]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$REGION",
        "title": "Cost and Budget Metrics",
        "period": 300,
        "stat": "Average"
      }
    }
  ]
}
EOF
)

aws cloudwatch put-dashboard \
    --dashboard-name "$DASHBOARD_NAME" \
    --dashboard-body "$DASHBOARD_BODY" \
    --region "$REGION" > /dev/null

echo "✅ CloudWatch dashboard created: $DASHBOARD_NAME"

# Create CloudWatch alarms
echo "⚠️  Creating CloudWatch alarms..."

# Budget utilization warning (80%)
aws cloudwatch put-metric-alarm \
    --alarm-name "$FUNCTION_NAME-BudgetWarning" \
    --alarm-description "Budget utilization has reached 80%" \
    --metric-name "BudgetUtilization" \
    --namespace "CampusVibe/Application" \
    --statistic "Average" \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 80 \
    --comparison-operator "GreaterThanThreshold" \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --dimensions Name=Service,Value=CampusVibe \
    --region "$REGION" > /dev/null

# Budget utilization critical (95%)
aws cloudwatch put-metric-alarm \
    --alarm-name "$FUNCTION_NAME-BudgetCritical" \
    --alarm-description "Budget utilization has reached 95%" \
    --metric-name "BudgetUtilization" \
    --namespace "CampusVibe/Application" \
    --statistic "Average" \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 95 \
    --comparison-operator "GreaterThanThreshold" \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --dimensions Name=Service,Value=CampusVibe \
    --region "$REGION" > /dev/null

# Lambda function errors
aws cloudwatch put-metric-alarm \
    --alarm-name "$FUNCTION_NAME-LambdaErrors" \
    --alarm-description "Lambda function error rate is high" \
    --metric-name "Errors" \
    --namespace "AWS/Lambda" \
    --statistic "Sum" \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 10 \
    --comparison-operator "GreaterThanThreshold" \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --dimensions Name=FunctionName,Value="$FUNCTION_NAME" \
    --region "$REGION" > /dev/null

# API response time alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "$FUNCTION_NAME-HighResponseTime" \
    --alarm-description "API response time is above 2 seconds" \
    --metric-name "ApiResponseTime" \
    --namespace "CampusVibe/Application" \
    --statistic "Average" \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 2000 \
    --comparison-operator "GreaterThanThreshold" \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --region "$REGION" > /dev/null

echo "✅ CloudWatch alarms created"

# Create log group if it doesn't exist
LOG_GROUP_NAME="/aws/lambda/$FUNCTION_NAME"
echo "📝 Setting up CloudWatch Logs..."

if ! aws logs describe-log-groups \
    --log-group-name-prefix "$LOG_GROUP_NAME" \
    --region "$REGION" \
    --query 'logGroups[?logGroupName==`'$LOG_GROUP_NAME'`]' \
    --output text | grep -q "$LOG_GROUP_NAME"; then
    
    aws logs create-log-group \
        --log-group-name "$LOG_GROUP_NAME" \
        --region "$REGION" > /dev/null
    echo "✅ Log group created: $LOG_GROUP_NAME"
else
    echo "✅ Log group already exists: $LOG_GROUP_NAME"
fi

# Set log retention policy
aws logs put-retention-policy \
    --log-group-name "$LOG_GROUP_NAME" \
    --retention-in-days 7 \
    --region "$REGION" > /dev/null

echo "✅ Log retention policy set to 7 days"

# Output monitoring URLs
echo ""
echo "🎉 Monitoring infrastructure deployed successfully!"
echo ""
echo "📊 CloudWatch Dashboard:"
echo "   https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=$DASHBOARD_NAME"
echo ""
echo "⚠️  CloudWatch Alarms:"
echo "   https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#alarmsV2:"
echo ""
echo "📝 CloudWatch Logs:"
echo "   https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#logsV2:log-groups/log-group/\$252Faws\$252Flambda\$252F$FUNCTION_NAME"
echo ""
echo "📧 SNS Topic: $SNS_TOPIC_ARN"
echo "   (Check your email to confirm subscription)"
echo ""
echo "💡 Useful Log Insights Queries:"
echo "   Error Analysis:"
echo "   fields @timestamp, @message, level, error"
echo "   | filter level = \"ERROR\""
echo "   | sort @timestamp desc"
echo ""
echo "   Performance Analysis:"
echo "   fields @timestamp, @message, duration, lambda.remainingTime"
echo "   | filter @message like /Lambda Response Completed/"
echo "   | sort @timestamp desc"
echo ""
echo "   Cost Analysis:"
echo "   fields @timestamp, @message, estimatedCost, gbSeconds"
echo "   | filter @message like /Cost Metrics/"
echo "   | sort @timestamp desc"
echo ""

# Save configuration for future reference
CONFIG_FILE=".monitoring-config.json"
cat > "$CONFIG_FILE" << EOF
{
  "serviceName": "$SERVICE_NAME",
  "stage": "$STAGE",
  "region": "$REGION",
  "functionName": "$FUNCTION_NAME",
  "snsTopicArn": "$SNS_TOPIC_ARN",
  "dashboardName": "$DASHBOARD_NAME",
  "logGroupName": "$LOG_GROUP_NAME",
  "alertEmail": "$ALERT_EMAIL",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "💾 Configuration saved to $CONFIG_FILE"
echo ""
echo "🔍 To view real-time metrics, visit the health endpoint:"
echo "   https://your-api-gateway-url/api/health"
echo "   https://your-api-gateway-url/api/monitoring/costs"