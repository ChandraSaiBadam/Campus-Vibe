# S3 + CloudFront Deployment Guide

This guide covers the enhanced S3 and CloudFront deployment system for cost-effective frontend hosting.

## Overview

The deployment system provides:

- **Infrastructure as Code**: CloudFormation templates for reproducible deployments
- **Cost Optimization**: Aggressive caching and PriceClass_100 for minimal costs
- **Global Performance**: CloudFront CDN for sub-3-second load times worldwide
- **Security**: WAF protection and HTTPS enforcement
- **Monitoring**: Cost tracking and performance monitoring

## Quick Start

### 1. Initial Deployment (Infrastructure + Frontend)

```bash
# Deploy to production with default settings
./scripts/deploy-s3-cloudfront.sh

# Deploy to staging
./scripts/deploy-s3-cloudfront.sh -e staging

# Deploy with custom domain
./scripts/deploy-s3-cloudfront.sh -d yourdomain.com -c arn:aws:acm:us-east-1:123456789012:certificate/abc123
```

### 2. Quick Updates (Frontend Only)

```bash
# Quick update to production
./scripts/quick-deploy-frontend.sh

# Quick update to staging
./scripts/quick-deploy-frontend.sh staging
```

### 3. Cost Monitoring

```bash
# Basic cost monitoring
./scripts/monitor-frontend-costs.sh

# Detailed cost breakdown
./scripts/monitor-frontend-costs.sh --detailed

# Custom budget thresholds
./scripts/monitor-frontend-costs.sh --budget 10 --warning 7
```

## Deployment Scripts

### Enhanced Deployment Script

**File**: `scripts/deploy-s3-cloudfront.sh`

**Features**:

- CloudFormation infrastructure management
- Cost-optimized CloudFront configuration
- Automated SSL certificate handling
- WAF security rules
- Cost monitoring alarms

**Usage**:

```bash
./scripts/deploy-s3-cloudfront.sh [OPTIONS]

Options:
  -e, --env ENVIRONMENT      Environment (staging|production)
  -r, --region REGION        AWS region (default: us-east-1)
  -d, --domain DOMAIN        Custom domain for CloudFront
  -c, --certificate ARN      SSL certificate ARN
  -p, --price-class CLASS    CloudFront price class
  --skip-build              Skip frontend build
  --skip-infrastructure     Skip CloudFormation deployment
  --force-update            Force update infrastructure
```

### Quick Deployment Script

**File**: `scripts/quick-deploy-frontend.sh`

**Features**:

- Fast frontend-only updates
- Uses existing infrastructure
- Optimized file uploads
- Automatic cache invalidation

**Usage**:

```bash
./scripts/quick-deploy-frontend.sh [ENVIRONMENT]
```

### Cost Monitoring Script

**File**: `scripts/monitor-frontend-costs.sh`

**Features**:

- Real-time cost tracking
- Budget threshold alerts
- Usage metrics analysis
- Cost optimization recommendations

**Usage**:

```bash
./scripts/monitor-frontend-costs.sh [ENVIRONMENT] [OPTIONS]

Options:
  --budget AMOUNT       Monthly budget threshold
  --warning AMOUNT      Warning threshold
  --detailed           Show detailed metrics
  --json               JSON output format
```

## Infrastructure Components

### CloudFormation Template

**File**: `aws/cloudformation/frontend-infrastructure.yml`

**Resources Created**:

- S3 bucket with static website hosting
- CloudFront distribution with optimized caching
- Origin Access Identity for security
- WAF Web ACL for protection
- CloudWatch alarms for monitoring
- S3 bucket for CloudFront logs

### Cost Optimization Features

1. **CloudFront Price Class**: Uses PriceClass_100 (US, Canada, Europe only)
2. **Aggressive Caching**: 1-year cache for static assets, 5-minute cache for HTML
3. **Compression**: Automatic GZIP compression enabled
4. **Storage Optimization**: S3 Standard with lifecycle policies
5. **Request Optimization**: Minimized S3 requests through CloudFront caching

### Security Features

1. **HTTPS Enforcement**: All traffic redirected to HTTPS
2. **WAF Protection**: Rate limiting and common attack protection
3. **Origin Access Identity**: Direct S3 access blocked
4. **Security Headers**: Proper cache and security headers
5. **SSL/TLS**: Modern TLS versions only

## NPM Scripts

Add these to your workflow:

```bash
# Infrastructure deployment
npm run deploy:s3-cloudfront              # Production deployment
npm run deploy:s3-cloudfront:staging      # Staging deployment

# Quick updates
npm run deploy:quick                      # Quick production update
npm run deploy:quick:staging              # Quick staging update

# Cost monitoring
npm run monitor:costs                     # Basic cost monitoring
npm run monitor:costs:detailed            # Detailed cost analysis
```

## Environment Configuration

### Required Environment Variables

```bash
# AWS Configuration
AWS_PROFILE=your-profile          # Optional: AWS profile to use
AWS_REGION=us-east-1             # Optional: AWS region

# Custom Domain (Optional)
CUSTOM_DOMAIN=yourdomain.com     # Custom domain name
SSL_CERTIFICATE_ARN=arn:aws:acm:... # SSL certificate ARN
```

### Frontend Environment Files

The deployment automatically updates your environment files:

```bash
# .env.production
REACT_APP_CDN_URL=https://d123abc.cloudfront.net
# Deployed: 2024-01-15T10:30:00Z
```

## Cost Breakdown

### Expected Monthly Costs (Under $5 Budget)

| Service             | Usage         | Cost             |
| ------------------- | ------------- | ---------------- |
| S3 Storage          | 1GB           | $0.023           |
| S3 Requests         | 10K requests  | $0.004           |
| CloudFront          | 10GB transfer | $0.85            |
| CloudFront Requests | 100K requests | $0.075           |
| **Total**           |               | **~$0.95/month** |

### Cost Monitoring Thresholds

- **Budget Threshold**: $5.00/month
- **Warning Threshold**: $3.50/month
- **Alert Frequency**: Daily monitoring
- **Automatic Actions**: Email notifications via CloudWatch

## Performance Optimization

### Caching Strategy

```bash
# Static Assets (JS, CSS, Images)
Cache-Control: public, max-age=31536000, immutable

# HTML Files
Cache-Control: public, max-age=300, must-revalidate

# Service Worker
Cache-Control: no-cache, no-store, must-revalidate

# Other Files
Cache-Control: public, max-age=86400
```

### Global Performance

- **CloudFront Edge Locations**: 200+ locations worldwide
- **HTTP/2**: Enabled for faster loading
- **Compression**: Automatic GZIP compression
- **Keep-Alive**: Connection reuse for efficiency

## Monitoring and Alerts

### CloudWatch Alarms

1. **High Error Rate**: Triggers when 4xx/5xx errors exceed 5%
2. **Cost Alarm**: Triggers when monthly costs exceed $5
3. **Performance Alarm**: Monitors response times

### Cost Monitoring

```bash
# Daily cost check
./scripts/monitor-frontend-costs.sh

# Weekly detailed analysis
./scripts/monitor-frontend-costs.sh --detailed --json > cost-report.json
```

## Troubleshooting

### Common Issues

1. **CloudFormation Stack Fails**

   ```bash
   # Check stack events
   aws cloudformation describe-stack-events --stack-name campus-vibe-frontend-production

   # Delete failed stack and retry
   aws cloudformation delete-stack --stack-name campus-vibe-frontend-production
   ```

2. **Custom Domain Not Working**

   ```bash
   # Verify certificate is in us-east-1
   aws acm list-certificates --region us-east-1

   # Check DNS configuration
   dig yourdomain.com CNAME
   ```

3. **High Costs**

   ```bash
   # Analyze cost breakdown
   ./scripts/monitor-frontend-costs.sh --detailed

   # Check CloudFront cache hit ratio
   aws cloudwatch get-metric-statistics --namespace AWS/CloudFront --metric-name CacheHitRate
   ```

4. **Slow Performance**

   ```bash
   # Check CloudFront distribution status
   aws cloudfront get-distribution --id E123ABCDEFGHIJ

   # Verify cache headers
   curl -I https://yourdomain.com/static/js/main.js
   ```

### Debug Commands

```bash
# Check deployment status
cat frontend-deployment-info.json | jq '.'

# Verify S3 bucket configuration
aws s3api get-bucket-website --bucket your-bucket-name

# Check CloudFront distribution
aws cloudfront list-distributions --query 'DistributionList.Items[0]'

# Monitor real-time costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost
```

## Best Practices

### Development Workflow

1. **Local Development**: Use `npm start` for local development
2. **Staging Deployment**: Deploy to staging first for testing
3. **Production Deployment**: Deploy to production after staging validation
4. **Cost Monitoring**: Check costs weekly
5. **Performance Testing**: Monitor Core Web Vitals

### Security Best Practices

1. **SSL Certificates**: Always use valid SSL certificates
2. **WAF Rules**: Keep WAF rules updated
3. **Access Logs**: Monitor CloudFront access logs
4. **Origin Access**: Never allow direct S3 access
5. **Security Headers**: Implement proper security headers

### Cost Optimization Tips

1. **Cache Optimization**: Maximize cache hit ratios
2. **Image Optimization**: Compress images before deployment
3. **Bundle Optimization**: Minimize JavaScript bundle sizes
4. **Geographic Restrictions**: Use appropriate price classes
5. **Lifecycle Policies**: Implement S3 lifecycle policies for logs

## Integration with Backend

### CORS Configuration

Update your backend CORS settings to allow your CloudFront domain:

```javascript
// In your backend CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://d123abc.cloudfront.net", // CloudFront URL
  "https://yourdomain.com", // Custom domain
];
```

### API Gateway Integration

The deployment automatically configures the frontend to use your API Gateway URL:

```bash
# Auto-configure API URL after backend deployment
npm run configure:api:auto
```

## Next Steps

1. **Deploy Infrastructure**: Run the enhanced deployment script
2. **Configure Custom Domain**: Set up DNS records if using custom domain
3. **Monitor Costs**: Set up regular cost monitoring
4. **Performance Testing**: Test global performance
5. **Security Review**: Review WAF rules and security settings

For additional help, refer to the AWS documentation or check the troubleshooting section above.
