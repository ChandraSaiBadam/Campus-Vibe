# Monitoring and Cost Tracking Setup Guide

This guide covers the comprehensive monitoring and cost tracking system for Campus Vibe's AWS deployment.

## Overview

The monitoring system provides:

- **Real-time Performance Monitoring**: Lambda, API Gateway, and application metrics
- **Cost Tracking**: Detailed cost analysis with budget alerts
- **Error Monitoring**: Comprehensive error logging and alerting
- **Performance Analytics**: Response time and throughput analysis
- **Free Tier Monitoring**: Track AWS free tier utilization

## Quick Start

### 1. Deploy Monitoring Infrastructure

```bash
# Deploy comprehensive monitoring with CloudFormation
./scripts/deploy-monitoring.sh -f campus-vibe-production-api -m admin@example.com

# Or use the legacy script for basic monitoring
./deploy-monitoring.sh production
```

### 2. Analyze Costs

```bash
# Current month cost analysis
./scripts/analyze-costs.sh

# Detailed analysis with recommendations
./scripts/analyze-costs.sh --detailed --recommendations

# Specific service analysis
./scripts/analyze-costs.sh --service lambda --json
```

### 3. Monitor Performance

```bash
# Check application health
curl https://your-api-url.com/api/monitoring/health

# Get cost dashboard
curl https://your-api-url.com/api/monitoring/costs
```

## Monitoring Components

### CloudFormation Infrastructure

**File**: `aws/cloudformation/monitoring-infrastructure.yml`

**Resources Created**:

- SNS Topic for alerts with email subscription
- CloudWatch Dashboard with comprehensive metrics
- CloudWatch Alarms for performance and cost monitoring
- Log Groups with proper retention policies
- Cost Anomaly Detection for unusual spending patterns

### Enhanced Deployment Script

**File**: `scripts/deploy-monitoring.sh`

**Features**:

- CloudFormation-based infrastructure deployment
- Automatic Lambda function validation
- API Gateway integration (optional)
- Custom budget threshold configuration
- Comprehensive alarm setup

**Usage**:

```bash
./scripts/deploy-monitoring.sh [OPTIONS]

Options:
  -f, --function FUNCTION    Lambda function name (required)
  -m, --email EMAIL          Alert email address (required)
  -e, --env ENVIRONMENT      Environment (staging|production)
  -b, --budget BUDGET        Monthly budget in USD (default: 5.0)
  -g, --gateway GATEWAY      API Gateway ID (optional)
```

### Cost Analysis Script

**File**: `scripts/analyze-costs.sh`

**Features**:

- Multi-service cost analysis (Lambda, API Gateway, S3, CloudFront)
- Free tier utilization tracking
- Budget projection and alerts
- Cost optimization recommendations
- Multiple output formats (JSON, CSV, detailed)

**Usage**:

```bash
./scripts/analyze-costs.sh [OPTIONS]

Options:
  -p, --period PERIOD        Analysis period (current-month|last-month|last-7-days|last-30-days)
  -s, --service SERVICE      Specific service analysis (lambda|apigateway|s3|cloudfront|all)
  -b, --budget BUDGET        Budget threshold in USD
  --detailed                 Show detailed breakdown
  --recommendations          Show optimization recommendations
  --json                     JSON output format
```

## Monitoring Dashboards

### CloudWatch Dashboard

The system creates a comprehensive CloudWatch dashboard with:

1. **Lambda Performance Metrics**

   - Invocations, Errors, Duration, Throttles
   - Concurrent Executions
   - Memory Utilization

2. **API Gateway Metrics**

   - Request Count, 4xx/5xx Errors
   - Latency and Response Times

3. **Cost Monitoring**

   - Estimated Monthly Cost
   - Budget Utilization Percentage
   - Free Tier Utilization

4. **Application Metrics**

   - API Response Times by Method
   - Database Operation Performance
   - Error Analysis and Trends

5. **Log Insights Queries**
   - Recent Errors
   - Slow API Requests (>2s)
   - Cost Tracking Events

### Custom Metrics

The application automatically tracks:

```javascript
// Performance Metrics
- ApiRequests (by method, route, status)
- ApiResponseTime (by method, route)
- ApiErrors (by status class)
- DatabaseResponseTime (by operation, collection)

// Cost Metrics
- EstimatedMonthlyCost
- BudgetUtilization
- LambdaRequestsFreeTierUtilization
- LambdaComputeFreeTierUtilization
- ApiGatewayFreeTierUtilization

// System Metrics
- MemoryHeapUsed
- MemoryUtilization
- ColdStarts
```

## Alerting System

### CloudWatch Alarms

**Budget Alerts**:

- Warning at 80% of monthly budget
- Critical at 95% of monthly budget

**Performance Alerts**:

- Lambda errors > 5 in 5 minutes
- API response time > 2 seconds
- Lambda duration > 10 seconds
- Lambda throttling detected

**Free Tier Alerts**:

- Lambda requests > 90% of free tier
- API Gateway requests > 90% of free tier

### SNS Notifications

All alerts are sent via SNS to configured email addresses with:

- Alert severity level
- Detailed metrics and context
- Recommended actions
- Links to relevant dashboards

## Cost Tracking

### Real-time Cost Monitoring

The system tracks costs in real-time using:

```javascript
// Cost Tracking Middleware
app.use(costTrackingMiddleware());

// Lambda Cost Tracking
trackLambdaCost(context, duration);

// Cost Dashboard API
GET / api / monitoring / costs;
```

### Budget Management

**Monthly Budget**: $5.00 (configurable)
**Warning Threshold**: 80% ($4.00)
**Critical Threshold**: 95% ($4.75)

### Free Tier Monitoring

Tracks utilization of AWS Free Tier:

- **Lambda**: 1M requests + 400K GB-seconds per month
- **API Gateway**: 1M requests per month
- **S3**: 5GB storage + 20K GET requests
- **CloudFront**: 50GB data transfer + 2M requests

## NPM Scripts

Add these to your development workflow:

```bash
# Server-side monitoring
cd server
npm run deploy:monitoring              # Deploy monitoring infrastructure
npm run analyze:costs                  # Basic cost analysis
npm run analyze:costs:detailed         # Detailed cost analysis with recommendations

# Client-side monitoring
cd client
npm run monitor:costs                  # Monitor frontend costs
npm run monitor:costs:detailed         # Detailed frontend cost analysis
```

## Log Analysis

### CloudWatch Logs Insights Queries

**Error Analysis**:

```sql
fields @timestamp, level, message, error
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

**Performance Analysis**:

```sql
fields @timestamp, @message, duration, lambda.remainingTime
| filter @message like /API Request/
| sort @timestamp desc
| limit 50
```

**Cost Analysis**:

```sql
fields @timestamp, @message, estimatedCost, gbSeconds
| filter @message like /Cost Metrics/
| sort @timestamp desc
| limit 50
```

**High Response Time Analysis**:

```sql
fields @timestamp, @message, duration
| filter @message like /API Request/ and duration > 2000
| sort @timestamp desc
| limit 50
```

### Log Retention

- **Application Logs**: 14 days retention
- **Cost Monitoring Logs**: 30 days retention
- **Access Logs**: 7 days retention

## Performance Monitoring

### Key Performance Indicators (KPIs)

1. **Response Time**: < 2 seconds (99th percentile)
2. **Error Rate**: < 1% of total requests
3. **Availability**: > 99.5% uptime
4. **Cost Efficiency**: < $5/month total AWS costs

### Performance Thresholds

| Metric            | Warning | Critical | Action                   |
| ----------------- | ------- | -------- | ------------------------ |
| API Response Time | > 1.5s  | > 2s     | Optimize code/database   |
| Lambda Duration   | > 8s    | > 10s    | Increase memory/optimize |
| Error Rate        | > 1%    | > 5%     | Investigate and fix      |
| Memory Usage      | > 75%   | > 90%    | Increase allocation      |
| Cost              | > $4    | > $4.75  | Optimize resources       |

## Cost Optimization

### Automatic Optimizations

1. **Lambda Configuration**

   - ARM64 architecture for better price/performance
   - Optimized memory allocation (512MB)
   - Connection reuse enabled
   - Provisioned concurrency for production

2. **API Gateway Caching**

   - 5-minute cache TTL for API responses
   - Cache key optimization
   - Compression enabled

3. **CloudWatch Optimization**
   - 7-day log retention for cost savings
   - Selective metric collection
   - Efficient alarm configuration

### Manual Optimization Recommendations

The cost analysis script provides recommendations such as:

- Implement S3 lifecycle policies
- Use CloudFront PriceClass_100
- Optimize Lambda memory allocation
- Enable API Gateway caching
- Use Reserved Capacity for predictable workloads

## Troubleshooting

### Common Issues

1. **High Costs**

   ```bash
   # Analyze cost breakdown
   ./scripts/analyze-costs.sh --detailed --recommendations

   # Check free tier utilization
   ./scripts/analyze-costs.sh --service all --json | jq '.costs'
   ```

2. **Performance Issues**

   ```bash
   # Check CloudWatch dashboard
   # Review slow query logs
   # Analyze memory utilization
   ```

3. **Alert Fatigue**
   ```bash
   # Adjust alarm thresholds in CloudFormation template
   # Update budget limits
   # Review alert frequency
   ```

### Debug Commands

```bash
# Check monitoring deployment status
aws cloudformation describe-stacks --stack-name campus-vibe-monitoring-production

# View recent alarms
aws cloudwatch describe-alarms --state-value ALARM

# Check SNS subscriptions
aws sns list-subscriptions

# View cost anomaly detectors
aws ce get-anomaly-detectors
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Deploy and Monitor
on:
  push:
    branches: [main]

jobs:
  deploy-and-monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy Application
        run: ./deploy-lambda.sh

      - name: Deploy Monitoring
        run: ./scripts/deploy-monitoring.sh -f ${{ secrets.LAMBDA_FUNCTION_NAME }} -m ${{ secrets.ALERT_EMAIL }}

      - name: Cost Analysis
        run: ./scripts/analyze-costs.sh --json > cost-report.json

      - name: Upload Cost Report
        uses: actions/upload-artifact@v2
        with:
          name: cost-report
          path: cost-report.json
```

## Security Considerations

1. **IAM Permissions**: Monitoring uses least-privilege IAM roles
2. **SNS Security**: Email subscriptions require confirmation
3. **Log Security**: No sensitive data logged in CloudWatch
4. **Cost Data**: Aggregated cost data only, no account details exposed

## Best Practices

1. **Regular Monitoring**: Check dashboards weekly
2. **Cost Reviews**: Analyze costs monthly
3. **Alert Tuning**: Adjust thresholds based on usage patterns
4. **Performance Testing**: Regular load testing with monitoring
5. **Documentation**: Keep monitoring configuration documented

## Next Steps

1. **Set Up Monitoring**: Deploy the monitoring infrastructure
2. **Configure Alerts**: Customize alert thresholds for your needs
3. **Regular Reviews**: Schedule weekly monitoring reviews
4. **Cost Optimization**: Implement recommended optimizations
5. **Advanced Monitoring**: Consider additional custom metrics

For additional help, refer to the AWS CloudWatch documentation or check the troubleshooting section above.
