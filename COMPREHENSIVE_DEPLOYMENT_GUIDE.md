# Campus Vibe - Comprehensive Deployment Guide

This is the complete deployment guide for Campus Vibe, covering all deployment options with cost-effective AWS serverless architecture, monitoring, and optimization.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites](#prerequisites)
4. [Environment Setup](#environment-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Monitoring Setup](#monitoring-setup)
8. [Cost Optimization](#cost-optimization)
9. [Testing & Validation](#testing--validation)
10. [Maintenance & Updates](#maintenance--updates)
11. [Troubleshooting](#troubleshooting)
12. [Alternative Deployments](#alternative-deployments)

## 🚀 Quick Start

**Total Cost: $0.95-$5/month** - Perfect for 2000 concurrent users, 300 average users

### One-Command Deployment

```bash
# 1. Clone and setup
git clone <your-repo>
cd campus-vibe

# 2. Configure environment (see Environment Setup section)
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and secrets

# 3. Deploy everything with monitoring
./scripts/deploy-complete.sh -e production -m admin@example.com
```

### Manual Step-by-Step (Recommended for first deployment)

```bash
# 1. Deploy backend infrastructure
./scripts/deploy-lambda.sh

# 2. Deploy frontend infrastructure
./scripts/deploy-s3-cloudfront.sh -e production

# 3. Deploy monitoring
./scripts/deploy-monitoring.sh -f campus-vibe-production-api -m admin@example.com

# 4. Validate deployment
./scripts/validate-deployment.js
```

## 🏗️ Architecture Overview

### Cost-Optimized Serverless Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Users         │    │   CloudFront     │    │   S3 Bucket     │
│   (Global)      │───▶│   (Global CDN)   │───▶│   (Frontend)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Lambda         │    │   MongoDB       │
│   (REST API)    │───▶│   (Backend)      │───▶│   Atlas         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   CloudWatch     │
                       │   (Monitoring)   │
                       └──────────────────┘
```

### Components & Costs

| Component         | Purpose          | Monthly Cost | Free Tier     |
| ----------------- | ---------------- | ------------ | ------------- |
| **AWS Lambda**    | Backend API      | $0-0.50      | 1M requests   |
| **API Gateway**   | REST API         | $0-0.20      | 1M requests   |
| **S3**            | Frontend hosting | $0.02        | 5GB storage   |
| **CloudFront**    | Global CDN       | $0.08        | 1TB transfer  |
| **CloudWatch**    | Monitoring       | $0.15        | Basic metrics |
| **MongoDB Atlas** | Database         | $0-9         | 512MB free    |
| **Total**         |                  | **$0.95-$5** |               |

## 📋 Prerequisites

### Required Accounts & Tools

1. **AWS Account** with billing enabled
2. **MongoDB Atlas** account (free tier)
3. **Domain** (optional, for custom domain)
4. **Email** for monitoring alerts

### Local Development Tools

```bash
# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install Serverless Framework
npm install -g serverless

# Install additional tools
npm install -g pm2  # For local development
brew install jq     # For JSON processing (macOS)
```

### AWS Configuration

```bash
# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID, Secret, Region (us-east-1), and output format (json)

# Verify configuration
aws sts get-caller-identity
```

## 🔧 Environment Setup

### 1. MongoDB Atlas Setup

1. **Create Account**: Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Create Cluster**: Choose M0 (free tier)
3. **Create Database User**:
   - Username: `campusvibe`
   - Password: Generate secure password
4. **Network Access**: Add `0.0.0.0/0` (allow from anywhere)
5. **Get Connection String**:
   ```
   mongodb+srv://campusvibe:<password>@cluster0.xxxxx.mongodb.net/campusvibe
   ```

### 2. Environment Variables

Create and configure environment files:

```bash
# Copy templates
cp server/.env.example server/.env
cp client/.env.example client/.env.production

# Edit server environment
nano server/.env
```

**Server Environment (`server/.env`)**:

```env
# Database
MONGODB_URI=mongodb+srv://campusvibe:<password>@cluster0.xxxxx.mongodb.net/campusvibe

# Security
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
ADMIN_SECRET=your-admin-secret-for-admin-operations

# Email Configuration (Gmail App Password recommended)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_SERVICE=gmail

# AWS Configuration (auto-configured during deployment)
AWS_REGION=us-east-1
NODE_ENV=production

# Performance
AWS_NODEJS_CONNECTION_REUSE_ENABLED=1
```

**Client Environment (`client/.env.production`)**:

```env
# API Configuration (auto-configured during deployment)
REACT_APP_API_URL=https://your-api-gateway-url
REACT_APP_ENVIRONMENT=production

# AWS Configuration
REACT_APP_AWS_REGION=us-east-1
REACT_APP_CDN_URL=https://your-cloudfront-url

# Performance Settings
REACT_APP_CACHE_TIMEOUT=300000
REACT_APP_PERFORMANCE_MONITORING=true
```

### 3. Validate Configuration

```bash
# Validate server configuration
cd server && npm run validate-env

# Validate client configuration
cd client && npm run validate:config production
```

## 🚀 Backend Deployment

### 1. Deploy Lambda Function

```bash
# Install dependencies
cd server && npm install

# Deploy with optimized configuration
npm run deploy:production

# Or use the enhanced script
../scripts/deploy-lambda.sh -e production -r us-east-1
```

### 2. Configure API Gateway

The deployment automatically configures:

- **CORS**: Proper cross-origin settings
- **Rate Limiting**: 1000 requests/second, 2000 burst
- **Caching**: 5-minute cache for GET requests
- **Compression**: Automatic response compression
- **Throttling**: Per-client rate limiting

### 3. Verify Backend Deployment

```bash
# Get API Gateway URL
aws cloudformation describe-stacks --stack-name campus-vibe-backend-production --query 'Stacks[0].Outputs'

# Test health endpoint
curl https://your-api-gateway-url/api/health

# Run comprehensive backend tests
cd server && npm run test:deployment
```

## 🌐 Frontend Deployment

### 1. Deploy S3 + CloudFront Infrastructure

```bash
# Deploy with CloudFormation
./scripts/deploy-s3-cloudfront.sh -e production

# Or deploy with custom domain
./scripts/deploy-s3-cloudfront.sh -e production -d yourdomain.com -c arn:aws:acm:certificate-arn
```

### 2. Configure Frontend API Connection

```bash
# Auto-configure API URL from backend deployment
cd client && npm run configure:api:auto

# Or manually configure
npm run configure:api:production https://your-api-gateway-url
```

### 3. Build and Deploy Frontend

```bash
# Build optimized frontend
cd client && npm run build:aws:production

# Deploy to S3 with optimized caching
aws s3 sync build/ s3://your-bucket-name/ --delete --cache-control "public, max-age=31536000" --exclude "*.html"
aws s3 sync build/ s3://your-bucket-name/ --delete --cache-control "public, max-age=300" --include "*.html"

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR-DISTRIBUTION-ID --paths "/*"
```

### 4. Verify Frontend Deployment

```bash
# Test frontend
curl -I https://your-cloudfront-url

# Run frontend validation
./scripts/validate-frontend-deployment.js production
```

## 📊 Monitoring Setup

### 1. Deploy Monitoring Infrastructure

```bash
# Deploy comprehensive monitoring
./scripts/deploy-monitoring.sh \
  -f campus-vibe-production-api \
  -m admin@example.com \
  -b 5.0 \
  -e production
```

### 2. Configure Cost Tracking

```bash
# Set up cost monitoring
cd server && npm run deploy:monitoring

# Analyze current costs
npm run analyze:costs:detailed
```

### 3. Set Up Alerts

The monitoring system automatically creates:

**Performance Alerts**:

- API response time > 2 seconds
- Lambda errors > 5 per 5 minutes
- Lambda duration > 10 seconds

**Cost Alerts**:

- Monthly cost > 80% of budget ($4.00)
- Monthly cost > 95% of budget ($4.75)
- Free tier utilization > 90%

**Availability Alerts**:

- Lambda throttling detected
- API Gateway 5xx errors > 5 per 5 minutes

### 4. Access Monitoring Dashboards

- **CloudWatch Dashboard**: https://console.aws.amazon.com/cloudwatch/home#dashboards:
- **Cost Explorer**: https://console.aws.amazon.com/cost-management/home#/cost-explorer
- **Application Health**: https://your-api-url/api/monitoring/health

## 💰 Cost Optimization

### Automatic Optimizations

The deployment includes several cost optimizations:

1. **Lambda Configuration**:

   - ARM64 architecture (20% cost reduction)
   - Optimized memory allocation (512MB)
   - Connection reuse enabled
   - 7-day log retention

2. **API Gateway**:

   - Request/response caching
   - Compression enabled
   - Throttling configured

3. **S3 + CloudFront**:

   - PriceClass_100 (US, Canada, Europe only)
   - Aggressive caching (1 year for static assets)
   - Lifecycle policies for logs

4. **Monitoring**:
   - Selective metric collection
   - Cost anomaly detection
   - Automated budget alerts

### Manual Optimizations

```bash
# Analyze costs and get recommendations
./scripts/analyze-costs.sh --detailed --recommendations

# Monitor frontend costs
cd client && npm run monitor:costs:detailed

# Optimize Lambda memory (if needed)
aws lambda update-function-configuration \
  --function-name campus-vibe-production-api \
  --memory-size 256  # Reduce if usage is low
```

### Cost Monitoring Commands

```bash
# Current month analysis
./scripts/analyze-costs.sh

# Specific service analysis
./scripts/analyze-costs.sh --service lambda --json

# Historical analysis
./scripts/analyze-costs.sh --period last-month --detailed

# Export cost data
./scripts/analyze-costs.sh --csv > costs.csv
```

## ✅ Testing & Validation

### 1. Comprehensive Deployment Testing

```bash
# Run all deployment tests
./test-deployment.js https://your-api-url https://your-frontend-url

# Backend-specific tests
cd server && npm run test:deployment

# Frontend-specific tests
cd client && npm run validate:deployment:production
```

### 2. Performance Testing

```bash
# Test API performance
curl -w "@curl-format.txt" -o /dev/null -s https://your-api-url/api/health

# Load testing (optional)
npx artillery quick --count 10 --num 5 https://your-api-url/api/health
```

### 3. Health Checks

```bash
# Application health
curl https://your-api-url/api/health

# Monitoring health
curl https://your-api-url/api/monitoring/health

# Cost monitoring
curl https://your-api-url/api/monitoring/costs
```

### 4. Validation Checklist

- [ ] Backend API responds within 2 seconds
- [ ] Frontend loads within 3 seconds globally
- [ ] All API endpoints functional
- [ ] Database connectivity working
- [ ] Email notifications working
- [ ] Monitoring alerts configured
- [ ] Cost tracking active
- [ ] HTTPS enforced
- [ ] CORS properly configured

## 🔄 Maintenance & Updates

### Regular Updates

```bash
# Update backend
cd server
git pull
npm run deploy:production

# Update frontend
cd client
git pull
npm run build:aws:production
./scripts/quick-deploy-frontend.sh production

# Update monitoring (if needed)
./scripts/deploy-monitoring.sh --force-update
```

### Monitoring & Maintenance

```bash
# Weekly cost analysis
./scripts/analyze-costs.sh --detailed --recommendations

# Monthly performance review
# Check CloudWatch dashboard
# Review error logs
# Analyze response times

# Quarterly optimization
# Review and adjust Lambda memory
# Update dependencies
# Review and optimize database queries
```

### Backup & Recovery

```bash
# MongoDB Atlas: Automatic backups (free tier includes 2-day retention)
# Lambda: Code in Git repository
# S3: Enable versioning for important files
aws s3api put-bucket-versioning --bucket your-bucket --versioning-configuration Status=Enabled

# Export configuration
aws cloudformation describe-stacks --stack-name campus-vibe-production > backup-config.json
```

## 🔧 Troubleshooting

### Common Issues

#### 1. High Costs

```bash
# Analyze cost breakdown
./scripts/analyze-costs.sh --detailed --recommendations

# Check free tier utilization
./scripts/analyze-costs.sh --service all --json | jq '.costs'

# Solutions:
# - Optimize Lambda memory allocation
# - Enable API Gateway caching
# - Review CloudFront price class
# - Implement S3 lifecycle policies
```

#### 2. Performance Issues

```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-api-url/api/health

# Check Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=campus-vibe-production-api \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average

# Solutions:
# - Increase Lambda memory
# - Optimize database queries
# - Enable connection pooling
# - Add API Gateway caching
```

#### 3. Deployment Failures

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name campus-vibe-production

# Check Lambda logs
aws logs tail /aws/lambda/campus-vibe-production-api --follow

# Check serverless deployment logs
cd server && serverless logs -f api --tail

# Common solutions:
# - Verify IAM permissions
# - Check environment variables
# - Validate MongoDB connection
# - Review resource limits
```

#### 4. CORS Issues

```bash
# Test CORS
curl -H "Origin: https://your-frontend-url" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-api-url/api/health

# Update CORS configuration in serverless.yml
# Redeploy backend
cd server && npm run deploy:production
```

### Debug Commands

```bash
# View all stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Check API Gateway configuration
aws apigateway get-rest-apis

# Check Lambda configuration
aws lambda get-function --function-name campus-vibe-production-api

# Check S3 bucket configuration
aws s3api get-bucket-website --bucket your-bucket-name

# Check CloudFront distribution
aws cloudfront list-distributions
```

### Log Analysis

```bash
# CloudWatch Logs Insights queries
aws logs start-query \
  --log-group-name "/aws/lambda/campus-vibe-production-api" \
  --start-time $(date -d "1 hour ago" +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20'

# Export logs
aws logs create-export-task \
  --log-group-name "/aws/lambda/campus-vibe-production-api" \
  --from $(date -d "1 day ago" +%s)000 \
  --to $(date +%s)000 \
  --destination your-s3-bucket \
  --destination-prefix logs/
```

## 🔄 Alternative Deployments

### Traditional Server Deployment

For traditional server deployment, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t campus-vibe-server ./server
docker build -t campus-vibe-client ./client
```

### Heroku Deployment

```bash
# Create Heroku app
heroku create campus-vibe-app

# Set environment variables
heroku config:set MONGODB_URI=your-mongodb-uri

# Deploy
git push heroku main
```

## 📚 Additional Resources

### Documentation Files

- **[README.md](README.md)** - Project overview and quick start
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Traditional deployment options
- **[SERVERLESS_DEPLOYMENT_GUIDE.md](SERVERLESS_DEPLOYMENT_GUIDE.md)** - Basic serverless deployment
- **[S3_CLOUDFRONT_DEPLOYMENT_GUIDE.md](S3_CLOUDFRONT_DEPLOYMENT_GUIDE.md)** - Frontend deployment details
- **[MONITORING_SETUP_GUIDE.md](MONITORING_SETUP_GUIDE.md)** - Monitoring and cost tracking
- **[HEALTH_CHECK_GUIDE.md](HEALTH_CHECK_GUIDE.md)** - Health monitoring system

### Scripts Reference

- **`./scripts/deploy-lambda.sh`** - Backend deployment
- **`./scripts/deploy-s3-cloudfront.sh`** - Frontend infrastructure
- **`./scripts/deploy-monitoring.sh`** - Monitoring setup
- **`./scripts/analyze-costs.sh`** - Cost analysis
- **`./scripts/validate-deployment.js`** - Deployment validation
- **`./test-deployment.js`** - Comprehensive testing

### Monitoring URLs

- **CloudWatch Dashboard**: https://console.aws.amazon.com/cloudwatch/home#dashboards:
- **Cost Explorer**: https://console.aws.amazon.com/cost-management/home#/cost-explorer
- **Lambda Console**: https://console.aws.amazon.com/lambda/home#/functions
- **API Gateway Console**: https://console.aws.amazon.com/apigateway/home#/apis
- **S3 Console**: https://console.aws.amazon.com/s3/home
- **CloudFront Console**: https://console.aws.amazon.com/cloudfront/home

## 🎯 Success Metrics

After successful deployment, you should achieve:

- **Cost**: $0.95-$5/month total AWS costs
- **Performance**: <2s API response time, <3s frontend load time
- **Availability**: >99.5% uptime
- **Scalability**: Handles 2000 concurrent users automatically
- **Monitoring**: Real-time cost and performance tracking
- **Security**: HTTPS enforced, proper CORS, rate limiting

---

**🎉 Congratulations!** Your Campus Vibe application is now deployed with enterprise-grade monitoring, cost optimization, and scalability. The system will automatically handle traffic spikes while keeping costs under $5/month.

For support, check the troubleshooting section or review the monitoring dashboards for real-time insights.
