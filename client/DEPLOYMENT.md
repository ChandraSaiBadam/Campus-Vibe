# Frontend AWS Deployment Guide

This document outlines the deployment process for the Campus Vibe React frontend to AWS using S3 and CloudFront.

## Prerequisites

- Node.js 18+ installed
- AWS CLI configured with appropriate permissions
- Environment variables configured for target deployment stage

## Environment Configuration

### Development

```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development
```

### Staging

```bash
REACT_APP_API_URL=https://your-staging-api-gateway-url.execute-api.us-east-1.amazonaws.com/staging
REACT_APP_ENVIRONMENT=staging
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

### Production

```bash
REACT_APP_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
REACT_APP_ENABLE_ANALYTICS=true
```

## Build Commands

### Standard Build

```bash
npm run build
```

### AWS Optimized Build

```bash
npm run build:aws
```

### Environment-Specific Builds

```bash
# Staging build
npm run build:staging

# Production build
npm run build:production
```

## Build Features

### Optimizations Applied

- Source maps disabled for production
- Inline runtime chunk disabled for better caching
- Gzip compression enabled
- Tree shaking for smaller bundle size
- Code splitting with lazy loading

### Environment Handling

- Automatic environment detection
- Environment-specific API configurations
- Retry logic with exponential backoff
- Health check endpoints for monitoring

### Build Artifacts

- Optimized static files in `build/` directory
- Build information in `build-info.json`
- Cache headers configuration
- Error boundary components

## Deployment Process

1. **Configure Environment Variables**

   ```bash
   # Update .env.production with actual API Gateway URL
   REACT_APP_API_URL=https://actual-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
   ```

2. **Build for Production**

   ```bash
   npm run build:production
   ```

3. **Deploy to S3** (will be automated in future tasks)

   ```bash
   # Upload build files to S3 bucket
   aws s3 sync build/ s3://campus-vibe-frontend-prod --delete
   ```

4. **Invalidate CloudFront Cache**
   ```bash
   # Clear CloudFront cache
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
   ```

## Monitoring and Validation

### Health Check

The application includes a health check endpoint that validates:

- API connectivity
- Environment configuration
- Build information
- Deployment status

### Deployment Info Component

In non-production environments, a deployment info panel shows:

- Current environment
- API endpoint URL
- Build version and hash
- Health status
- Manual health check trigger

### Performance Monitoring

- Web Vitals tracking (production only)
- Error boundary for graceful error handling
- Automatic retry logic for failed API calls
- Environment-specific logging levels

## Troubleshooting

### Common Issues

1. **API Connection Failures**

   - Verify REACT_APP_API_URL is correct
   - Check CORS configuration on API Gateway
   - Validate network connectivity

2. **Build Failures**

   - Ensure all environment variables are set
   - Check Node.js version compatibility
   - Verify dependencies are installed

3. **Deployment Issues**
   - Confirm AWS credentials are configured
   - Check S3 bucket permissions
   - Validate CloudFront distribution settings

### Debug Commands

```bash
# Validate environment configuration
node -e "console.log(process.env.REACT_APP_API_URL)"

# Test build process
npm run build:staging

# Check build output
ls -la build/
```

## Security Considerations

- Environment variables are embedded at build time
- No sensitive data should be in environment variables
- HTTPS enforced for all API communications
- Content Security Policy headers recommended
- Regular dependency updates for security patches

## Cost Optimization

- Gzip compression reduces transfer costs
- CloudFront caching minimizes origin requests
- Optimized bundle size reduces storage costs
- Lazy loading reduces initial load time
- Static asset caching improves performance
