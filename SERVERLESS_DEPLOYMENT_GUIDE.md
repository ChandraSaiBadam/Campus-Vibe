# Campus Vibe - Serverless AWS Deployment Guide

This guide provides step-by-step instructions for deploying the Campus Vibe application using AWS Lambda + API Gateway + MongoDB Atlas (Cost: $3-15/year).

## Architecture Overview

- **Backend**: AWS Lambda + API Gateway (serverless)
- **Frontend**: AWS S3 + CloudFront (static hosting)
- **Database**: MongoDB Atlas (free tier)
- **Cost**: $3-15/year for your traffic pattern

## Prerequisites

1. AWS Account with CLI configured
2. MongoDB Atlas account
3. Node.js installed locally
4. Git repository

## Step 1: MongoDB Atlas Setup

1. Create MongoDB Atlas account at https://www.mongodb.com/atlas
2. Create a free tier cluster (M0)
3. Create database user with read/write permissions
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/campusconnect`

## Step 2: AWS Setup

### Install AWS CLI and Serverless Framework

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure

# Install Serverless Framework globally
npm install -g serverless
```

### Create IAM User for Deployment

1. Go to AWS IAM Console
2. Create new user: `campus-vibe-deploy`
3. Attach `AdministratorAccess` policy (for simplicity)
4. Get Access Key ID and Secret Access Key
5. Configure AWS CLI with these credentials

## Step 3: Environment Configuration

1. Copy the production environment template:
```bash
cp server/.env.production server/.env
```

2. Update `server/.env` with your actual values:
```env
MONGODB_URI=mongodb+srv://your-user:your-pass@cluster.mongodb.net/campusconnect
JWT_SECRET=your-secure-jwt-secret-here
ADMIN_SECRET=your-admin-secret-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=https://your-s3-bucket-name.s3.amazonaws.com
```

## Step 4: Deploy Backend (Lambda + API Gateway)

### Install Dependencies

```bash
cd server
npm install
```

### Deploy to AWS

```bash
# Deploy to AWS (first time)
serverless deploy

# For subsequent deployments
serverless deploy
```

### Get API Gateway URL

After deployment, note the API Gateway URL from the output:
```
endpoints:
  ANY - https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
  ANY - https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/{proxy+}
```

## Step 5: Deploy Frontend (S3 + CloudFront)

### Build React App

```bash
cd client
npm install
npm run build
```

### Update API Calls

Update `client/src/` files to use the API Gateway URL instead of localhost:

```javascript
// Replace localhost URLs with API Gateway URL
const API_BASE_URL = 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod';
```

### Create S3 Bucket

```bash
# Create S3 bucket
aws s3 mb s3://your-campus-vibe-bucket

# Enable static website hosting
aws s3 website s3://your-campus-vibe-bucket --index-document index.html --error-document index.html

# Upload build files
aws s3 cp build/ s3://your-campus-vibe-bucket --recursive

# Make files public
aws s3api put-bucket-policy --bucket your-campus-vibe-bucket --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-campus-vibe-bucket/*"
    }
  ]
}'
```

### Create CloudFront Distribution

```bash
# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "campus-vibe-'$(date +%s)'",
  "Comment": "Campus Vibe Frontend",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-your-campus-vibe-bucket",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "DomainName": "your-campus-vibe-bucket.s3.amazonaws.com",
        "Id": "S3-your-campus-vibe-bucket",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "Enabled": true,
  "DefaultRootObject": "index.html"
}'
```

## Step 6: Update Environment Variables

Update the Lambda environment variables with the correct S3 bucket URL:

```bash
# Update Lambda environment variables
aws lambda update-function-configuration \
  --function-name campus-vibe-server-prod-api \
  --environment "Variables={MONGODB_URI='your-mongodb-uri',FRONTEND_URL='https://your-cloudfront-id.cloudfront.net'}"
```

## Step 7: Testing

### Test Backend API

```bash
# Test health endpoint
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/api/health
```

### Test Frontend

Visit your CloudFront URL: `https://your-cloudfront-id.cloudfront.net`

## Step 8: Cost Monitoring

### Set Up Billing Alerts

1. Go to AWS Billing Console
2. Create billing alarm for $5/month threshold
3. Set up email notifications

### Monitor Usage

```bash
# Check Lambda invocations
aws lambda get-function --function-name campus-connect-server-prod-api

# Check API Gateway usage
aws apigateway get-usage --rest-api-id your-api-id --start-date 2024-01-01 --end-date 2024-12-31
```

## Features Preserved

✅ **All API endpoints work** (forum, marketplace, reviews, GPA calculator)
✅ **File uploads supported** (using Lambda temporary storage)
✅ **Real-time features** (if Socket.IO is implemented)
✅ **Authentication & security** (JWT, rate limiting)
✅ **Email notifications**
✅ **Database operations** (MongoDB Atlas)

## Cost Optimization Tips

1. **Monitor Lambda duration** - optimize slow functions
2. **Use API Gateway caching** - reduce Lambda invocations
3. **Compress responses** - reduce data transfer costs
4. **Set up auto-scaling** - but you probably won't need it
5. **Use CloudFront** - reduces S3 costs and improves performance

## Troubleshooting

### Common Issues

1. **CORS Errors**: Update `FRONTEND_URL` in Lambda environment variables
2. **MongoDB Connection**: Check IP whitelist in MongoDB Atlas
3. **Lambda Timeouts**: Increase timeout in `serverless.yml`
4. **Memory Issues**: Increase memory size in `serverless.yml`

### Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/campus-vibe-server-prod-api --follow

# View API Gateway logs
aws logs tail /aws/apigateway/campus-vibe-server --follow
```

## Backup & Recovery

- **MongoDB Atlas**: Automatic backups included in free tier
- **Lambda**: No backup needed (code in Git)
- **S3**: Enable versioning for static files

## Security Considerations

1. **API Gateway**: Enable throttling and usage plans
2. **Lambda**: Use least-privilege IAM roles
3. **MongoDB**: Enable database authentication
4. **S3**: Use CloudFront signed URLs for sensitive content

## Maintenance

### Updates

```bash
# Update Lambda function
serverless deploy

# Update frontend
cd client
npm run build
aws s3 cp build/ s3://your-bucket --recursive
```

### Monitoring

- Set up CloudWatch alarms for errors
- Monitor API Gateway latency
- Track MongoDB Atlas usage

---

**Total Cost Summary**: $3-15/year
- Lambda: $0-8/year (1M free requests/month)
- API Gateway: $0-3/year (1M free requests/month)
- MongoDB Atlas: $0-9/year (free tier, then $9/month)
- S3 + CloudFront: $0-2/year (free tier covers your usage)