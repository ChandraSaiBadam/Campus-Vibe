# Campus Vibe - Troubleshooting Guide

This guide helps you diagnose and resolve common issues with Campus Vibe deployment and operation.

## 🔍 Quick Diagnostics

### Health Check Commands

```bash
# Check overall system health
curl https://your-api-url/api/health

# Check monitoring health
curl https://your-api-url/api/monitoring/health

# Check cost status
curl https://your-api-url/api/monitoring/costs

# Run comprehensive tests
./test-deployment.js https://your-api-url https://your-frontend-url
```

### System Status Check

```bash
# Check AWS services status
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
aws lambda list-functions --query 'Functions[?contains(FunctionName, `campus-vibe`)]'
aws s3 ls | grep campus-vibe
aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`Campus Vibe Frontend Distribution`]'
```

## 🚨 Common Issues

### 1. High AWS Costs

**Symptoms:**

- Monthly costs exceeding $5
- Budget alerts triggered
- Unexpected charges

**Diagnosis:**

```bash
# Analyze cost breakdown
./scripts/analyze-costs.sh --detailed --recommendations

# Check free tier utilization
./scripts/analyze-costs.sh --service all --json | jq '.costs'

# Monitor real-time costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost
```

**Solutions:**

1. **Lambda Optimization:**

   ```bash
   # Reduce Lambda memory if over-allocated
   aws lambda update-function-configuration \
     --function-name campus-vibe-production-api \
     --memory-size 256  # Reduce from 512MB if usage is low

   # Check actual memory usage
   aws logs filter-log-events \
     --log-group-name "/aws/lambda/campus-vibe-production-api" \
     --filter-pattern "REPORT" \
     --start-time $(date -d "1 day ago" +%s)000
   ```

2. **API Gateway Caching:**

   ```bash
   # Enable caching in serverless.yml
   # Redeploy with caching enabled
   cd server && serverless deploy
   ```

3. **CloudFront Optimization:**

   ```bash
   # Check cache hit ratio
   aws cloudwatch get-metric-statistics \
     --namespace AWS/CloudFront \
     --metric-name CacheHitRate \
     --dimensions Name=DistributionId,Value=YOUR-DISTRIBUTION-ID \
     --start-time $(date -d "1 day ago" +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date +%Y-%m-%dT%H:%M:%S) \
     --period 3600 \
     --statistics Average
   ```

4. **S3 Lifecycle Policies:**
   ```bash
   # Implement lifecycle policy for logs
   aws s3api put-bucket-lifecycle-configuration \
     --bucket your-logs-bucket \
     --lifecycle-configuration file://lifecycle-policy.json
   ```

### 2. Performance Issues

**Symptoms:**

- API response times > 2 seconds
- Frontend loading slowly
- Lambda timeouts

**Diagnosis:**

```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-api-url/api/health

# Check Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=campus-vibe-production-api \
  --start-time $(date -d "1 hour ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check database response times
aws logs filter-log-events \
  --log-group-name "/aws/lambda/campus-vibe-production-api" \
  --filter-pattern "Database Operation" \
  --start-time $(date -d "1 hour ago" +%s)000
```

**Solutions:**

1. **Lambda Performance:**

   ```bash
   # Increase Lambda memory for better CPU performance
   aws lambda update-function-configuration \
     --function-name campus-vibe-production-api \
     --memory-size 1024  # Increase from 512MB

   # Enable provisioned concurrency for consistent performance
   aws lambda put-provisioned-concurrency-config \
     --function-name campus-vibe-production-api \
     --provisioned-concurrency-config ProvisionedConcurrencyConfig=5
   ```

2. **Database Optimization:**

   ```bash
   # Check MongoDB Atlas performance
   # - Review slow query logs
   # - Add database indexes
   # - Optimize connection pooling
   ```

3. **API Gateway Optimization:**

   ```bash
   # Enable compression
   aws apigateway update-rest-api \
     --rest-api-id YOUR-API-ID \
     --patch-ops op=replace,path=/minimumCompressionSize,value=1024
   ```

4. **Frontend Optimization:**
   ```bash
   # Rebuild with optimizations
   cd client
   npm run build:aws:production
   ./scripts/quick-deploy-frontend.sh production
   ```

### 3. Deployment Failures

**Symptoms:**

- CloudFormation stack creation/update failures
- Serverless deployment errors
- Lambda function not updating

**Diagnosis:**

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name campus-vibe-production

# Check serverless deployment logs
cd server && serverless logs -f api --tail

# Check Lambda function status
aws lambda get-function --function-name campus-vibe-production-api
```

**Solutions:**

1. **IAM Permission Issues:**

   ```bash
   # Check current IAM permissions
   aws sts get-caller-identity
   aws iam get-user

   # Ensure user has necessary permissions:
   # - CloudFormation full access
   # - Lambda full access
   # - API Gateway full access
   # - S3 full access
   # - CloudWatch full access
   ```

2. **Resource Limits:**

   ```bash
   # Check AWS service limits
   aws service-quotas list-service-quotas --service-code lambda
   aws service-quotas list-service-quotas --service-code apigateway

   # Request limit increases if needed
   ```

3. **Environment Variable Issues:**

   ```bash
   # Validate environment variables
   cd server && npm run validate-env

   # Check Lambda environment variables
   aws lambda get-function-configuration --function-name campus-vibe-production-api
   ```

4. **Dependency Issues:**

   ```bash
   # Clear and reinstall dependencies
   cd server
   rm -rf node_modules package-lock.json
   npm install

   # Check for security vulnerabilities
   npm audit fix
   ```

### 4. CORS Issues

**Symptoms:**

- Frontend can't connect to API
- "Access-Control-Allow-Origin" errors
- Preflight request failures

**Diagnosis:**

```bash
# Test CORS manually
curl -H "Origin: https://your-frontend-url" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-api-url/api/health

# Check API Gateway CORS configuration
aws apigateway get-resource --rest-api-id YOUR-API-ID --resource-id YOUR-RESOURCE-ID
```

**Solutions:**

1. **Update CORS Configuration:**

   ```bash
   # Update serverless.yml CORS settings
   # Add your frontend URL to allowed origins
   cd server
   # Edit serverless.yml
   serverless deploy
   ```

2. **Environment Variable Update:**

   ```bash
   # Update Lambda environment variables
   aws lambda update-function-configuration \
     --function-name campus-vibe-production-api \
     --environment "Variables={FRONTEND_URL='https://your-frontend-url'}"
   ```

3. **API Gateway Manual Fix:**
   ```bash
   # Enable CORS on API Gateway resource
   aws apigateway put-method-response \
     --rest-api-id YOUR-API-ID \
     --resource-id YOUR-RESOURCE-ID \
     --http-method OPTIONS \
     --status-code 200 \
     --response-parameters method.response.header.Access-Control-Allow-Origin=false
   ```

### 5. Database Connection Issues

**Symptoms:**

- "MongoNetworkError" in logs
- Database operations timing out
- Connection pool exhaustion

**Diagnosis:**

```bash
# Check MongoDB Atlas connectivity
aws logs filter-log-events \
  --log-group-name "/aws/lambda/campus-vibe-production-api" \
  --filter-pattern "MongoDB" \
  --start-time $(date -d "1 hour ago" +%s)000

# Test connection from Lambda
aws lambda invoke \
  --function-name campus-vibe-production-api \
  --payload '{"httpMethod":"GET","path":"/api/health"}' \
  response.json
```

**Solutions:**

1. **MongoDB Atlas Configuration:**

   ```bash
   # Check IP whitelist (should include 0.0.0.0/0 for Lambda)
   # Verify database user permissions
   # Check connection string format
   ```

2. **Connection Pooling:**

   ```bash
   # Update MongoDB connection options in server code
   # Implement connection reuse for Lambda
   # Set appropriate pool size limits
   ```

3. **Network Security:**
   ```bash
   # Ensure MongoDB Atlas allows connections from AWS region
   # Check VPC configuration if using private networking
   ```

### 6. Monitoring Issues

**Symptoms:**

- No metrics in CloudWatch
- Alerts not triggering
- Missing log entries

**Diagnosis:**

```bash
# Check CloudWatch log groups
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/campus-vibe"

# Check CloudWatch metrics
aws cloudwatch list-metrics --namespace "CampusVibe/Application"

# Check SNS subscriptions
aws sns list-subscriptions
```

**Solutions:**

1. **Log Group Configuration:**

   ```bash
   # Ensure log group exists
   aws logs create-log-group --log-group-name "/aws/lambda/campus-vibe-production-api"

   # Set retention policy
   aws logs put-retention-policy \
     --log-group-name "/aws/lambda/campus-vibe-production-api" \
     --retention-in-days 14
   ```

2. **Metric Publishing:**

   ```bash
   # Check IAM permissions for CloudWatch
   # Verify custom metrics are being published
   # Test metric publishing manually
   ```

3. **Alert Configuration:**

   ```bash
   # Check alarm configuration
   aws cloudwatch describe-alarms --alarm-names "campus-vibe-production-budget-warning"

   # Test SNS topic
   aws sns publish \
     --topic-arn "arn:aws:sns:us-east-1:123456789012:campus-vibe-alerts" \
     --message "Test alert"
   ```

## 🔧 Debug Commands

### Log Analysis

```bash
# View recent errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/campus-vibe-production-api" \
  --filter-pattern "ERROR" \
  --start-time $(date -d "1 hour ago" +%s)000

# View performance issues
aws logs filter-log-events \
  --log-group-name "/aws/lambda/campus-vibe-production-api" \
  --filter-pattern "[timestamp, requestId, level=\"WARN\", message=\"*duration*\"]" \
  --start-time $(date -d "1 hour ago" +%s)000

# Export logs for analysis
aws logs create-export-task \
  --log-group-name "/aws/lambda/campus-vibe-production-api" \
  --from $(date -d "1 day ago" +%s)000 \
  --to $(date +%s)000 \
  --destination your-s3-bucket \
  --destination-prefix logs/
```

### Performance Analysis

```bash
# Lambda performance metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=campus-vibe-production-api \
  --start-time $(date -d "1 day ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum,Minimum

# API Gateway latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiName,Value=campus-vibe-production \
  --start-time $(date -d "1 day ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum
```

### Cost Analysis

```bash
# Detailed cost breakdown
./scripts/analyze-costs.sh --period current-month --detailed --recommendations

# Service-specific costs
./scripts/analyze-costs.sh --service lambda --json
./scripts/analyze-costs.sh --service apigateway --json
./scripts/analyze-costs.sh --service s3 --json

# Historical cost trends
./scripts/analyze-costs.sh --period last-month --csv > last-month-costs.csv
```

## 🛠️ Recovery Procedures

### Rollback Deployment

```bash
# Rollback Lambda function
aws lambda update-function-code \
  --function-name campus-vibe-production-api \
  --s3-bucket your-deployment-bucket \
  --s3-key previous-version.zip

# Rollback CloudFormation stack
aws cloudformation cancel-update-stack --stack-name campus-vibe-production

# Rollback frontend
aws s3 sync s3://your-backup-bucket/previous-build/ s3://your-frontend-bucket/ --delete
aws cloudfront create-invalidation --distribution-id YOUR-DISTRIBUTION-ID --paths "/*"
```

### Emergency Procedures

```bash
# Scale down to reduce costs immediately
aws lambda put-provisioned-concurrency-config \
  --function-name campus-vibe-production-api \
  --provisioned-concurrency-config ProvisionedConcurrencyConfig=0

# Disable API Gateway temporarily
aws apigateway update-stage \
  --rest-api-id YOUR-API-ID \
  --stage-name prod \
  --patch-ops op=replace,path=/throttle/rateLimit,value=1

# Emergency cost alert
aws sns publish \
  --topic-arn "arn:aws:sns:us-east-1:123456789012:campus-vibe-alerts" \
  --subject "EMERGENCY: High AWS Costs Detected" \
  --message "Immediate action required to reduce AWS costs"
```

## 📞 Getting Help

### Support Channels

1. **Documentation**: Check all guide files in the repository
2. **AWS Support**: Use AWS Support Center for AWS-specific issues
3. **MongoDB Atlas Support**: Use Atlas support for database issues
4. **Community**: GitHub Issues for application-specific problems

### Information to Collect

When seeking help, collect this information:

```bash
# System information
aws --version
node --version
npm --version
serverless --version

# Deployment information
cat deployment-report-*.json
cat monitoring-config.json
cat frontend-deployment-info.json

# Recent logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/campus-vibe-production-api" \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --max-items 50

# Current costs
./scripts/analyze-costs.sh --json
```

### Emergency Contacts

- **AWS Support**: https://console.aws.amazon.com/support/
- **MongoDB Atlas Support**: https://support.mongodb.com/
- **Application Issues**: Create GitHub issue with collected information

---

**Remember**: Most issues can be resolved by checking logs, validating configuration, and following the diagnostic steps above. Always test changes in a staging environment first!
