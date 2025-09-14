# AWS Deployment Specification - Campus Vibe

## Overview

Deploy Campus Vibe application to AWS using the most cost-effective architecture for 1000 average traffic, 3000 max traffic.

## Architecture

- **Backend**: AWS Lambda + API Gateway (serverless)
- **Frontend**: S3 + CloudFront (static hosting)
- **Database**: MongoDB Atlas (existing)
- **Estimated Cost**: $3-15/year

## User Stories

### As a developer, I want to deploy the backend to AWS Lambda

- **Given** the Express.js server with lambda handler
- **When** I deploy using serverless framework
- **Then** the API should be accessible via API Gateway URL
- **And** all endpoints should work correctly
- **And** environment variables should be properly configured

### As a developer, I want to deploy the frontend to S3

- **Given** the React build files
- **When** I upload to S3 with static hosting
- **Then** the frontend should be accessible via S3/CloudFront URL
- **And** API calls should connect to the Lambda backend

### As a developer, I want to configure AWS credentials

- **Given** AWS access key and secret key
- **When** I configure AWS CLI and serverless
- **Then** deployments should authenticate successfully

### As a user, I want the application to handle the expected traffic

- **Given** 1000 average requests, 3000 max requests
- **When** traffic hits the application
- **Then** Lambda should auto-scale to handle the load
- **And** costs should remain minimal

## Implementation Tasks

### Phase 1: AWS Setup & Configuration

- [ ] Configure AWS CLI with provided credentials
- [ ] Install serverless framework
- [ ] Update serverless.yml for optimal cost/performance
- [ ] Configure environment variables for production

### Phase 2: Backend Deployment

- [ ] Deploy Lambda function via serverless
- [ ] Configure API Gateway endpoints
- [ ] Test all API endpoints
- [ ] Verify database connectivity

### Phase 3: Frontend Deployment

- [ ] Build React application
- [ ] Update API endpoints to use Lambda URL
- [ ] Create S3 bucket for static hosting
- [ ] Upload build files to S3
- [ ] Configure CloudFront distribution
- [ ] Update CORS settings

### Phase 4: Testing & Optimization

- [ ] End-to-end testing of all features
- [ ] Performance optimization
- [ ] Cost monitoring setup
- [ ] Security configuration review

## Acceptance Criteria

- [ ] Backend API accessible via API Gateway URL
- [ ] Frontend accessible via CloudFront URL
- [ ] All application features working (GPA calc, marketplace, chat, etc.)
- [ ] Authentication and file uploads working
- [ ] Monthly cost under $15
- [ ] Application handles 3000 concurrent requests
- [ ] HTTPS enabled for both frontend and backend
- [ ] Environment variables properly secured

## Technical Requirements

- Node.js 18.x runtime for Lambda
- React build optimized for production
- MongoDB Atlas connection working
- CORS properly configured
- Rate limiting maintained
- File uploads working with Lambda

## Cost Optimization

- Use Lambda free tier (1M requests/month)
- Use API Gateway free tier (1M requests/month)
- Use S3 free tier for static hosting
- Use CloudFront free tier
- Optimize Lambda memory/timeout settings
- Enable compression and caching
