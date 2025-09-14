# Deployment Testing and Validation Guide

This document describes the comprehensive testing suite for validating the Campus Vibe application deployment.

## Overview

The testing suite validates that all application features work correctly in production environment, ensuring:

- API calls respond within 2 seconds (Requirement 4.2)
- Application remains available and responsive (Requirement 1.2)
- Uptime remains above 99.5% during high traffic (Requirement 4.3)

## Test Components

### 1. Backend Deployment Tests (`server/tests/deployment-tests.js`)

Automated testing scripts for all backend endpoints:

- **Health Check Endpoint** - Validates basic service availability
- **GPA Calculator** - Tests core functionality without database
- **Forum API** - Tests database-dependent endpoints
- **Marketplace API** - Tests marketplace functionality
- **Reviews API** - Tests review system
- **Timetable API** - Tests timetable functionality
- **Cost Monitoring** - Tests monitoring endpoints
- **Lambda Warmup** - Tests Lambda-specific functionality
- **CORS Configuration** - Tests cross-origin requests
- **Error Handling** - Tests 404 and error responses
- **Concurrent Load Test** - Tests multiple simultaneous requests

### 2. Enhanced Health Check Endpoints (`server/routes/health.js`)

Comprehensive monitoring endpoints:

- `GET /api/health/basic` - Basic health status
- `GET /api/health/detailed` - Detailed system metrics
- `GET /api/health/ready` - Readiness probe (Kubernetes-style)
- `GET /api/health/live` - Liveness probe (Kubernetes-style)
- `GET /api/health/features` - Feature availability validation
- `GET /api/health/benchmark` - Performance benchmarking
- `GET /api/health/database` - Database connectivity test
- `GET /api/health/metrics` - System metrics for monitoring
- `GET /api/health/status` - Comprehensive status overview

### 3. Frontend Validation (`client/src/tests/deployment-validation.js`)

Frontend-specific validation tests:

- **API Configuration** - Validates frontend API setup
- **Health Check API** - Tests backend connectivity
- **GPA Calculator API** - Tests API integration
- **Error Handling** - Tests error boundary functionality
- **Response Time Consistency** - Tests performance consistency
- **Environment Configuration** - Validates environment variables
- **Local Storage** - Tests browser storage functionality

### 4. Comprehensive Validation (`scripts/validate-deployment.js`)

End-to-end validation covering:

- **Backend Validation** - Full backend test suite
- **Frontend Validation** - Frontend accessibility and performance
- **Integration Testing** - CORS, API accessibility, environment consistency

## Running Tests

### Quick Test (Recommended)

```bash
# Test entire deployment (backend + frontend + integration)
npm run test:deployment

# Or with custom URLs
npm run test:deployment -- https://api.example.com https://app.example.com
```

### Individual Test Components

```bash
# Backend tests only
npm run test:backend

# Health check only
npm run test:health

# Comprehensive validation
npm run validate:deployment
```

### Manual Testing

```bash
# Backend deployment tests
cd server
node tests/deployment-tests.js [API_URL]

# Comprehensive validation
node scripts/validate-deployment.js [API_URL] [FRONTEND_URL]

# Simple health check
curl https://your-api-url.com/api/health
```

## Test Results Interpretation

### Success Criteria

- **Backend Tests**: All critical endpoints respond within 2 seconds
- **Frontend Tests**: Page loads within 3 seconds, all features accessible
- **Integration Tests**: CORS configured correctly, APIs accessible from frontend
- **Overall Success**: 80%+ success rate across all test categories

### Common Issues and Solutions

#### Backend Test Failures

1. **Database Connection Issues**

   - Check MongoDB Atlas connection string
   - Verify IP whitelist includes deployment environment
   - Ensure database credentials are correct

2. **Timeout Issues**

   - Check Lambda memory allocation (minimum 256MB recommended)
   - Verify cold start optimization
   - Review database connection pooling

3. **CORS Errors**
   - Verify frontend URL in environment variables
   - Check API Gateway CORS configuration
   - Ensure proper headers in Lambda response

#### Frontend Test Failures

1. **Load Time Issues**

   - Optimize bundle size
   - Enable CloudFront caching
   - Compress static assets

2. **API Connection Issues**
   - Verify API_BASE_URL environment variable
   - Check network connectivity
   - Validate SSL certificates

#### Integration Test Failures

1. **CORS Configuration**

   - Update CORS settings in backend
   - Verify allowed origins include frontend domain
   - Check preflight request handling

2. **Environment Mismatches**
   - Ensure consistent environment variables
   - Verify deployment stage configuration
   - Check API Gateway stage settings

## Monitoring and Alerting

### Health Check Endpoints for Monitoring

Use these endpoints for continuous monitoring:

```bash
# Basic health (fastest)
GET /api/health/basic

# Detailed metrics (comprehensive)
GET /api/health/detailed

# Kubernetes-style probes
GET /api/health/ready   # Readiness probe
GET /api/health/live    # Liveness probe

# Feature validation
GET /api/health/features
```

### Performance Metrics

The health endpoints provide key metrics:

- **Response Time**: Average API response time
- **Error Rate**: Percentage of failed requests
- **Uptime**: Service availability percentage
- **Memory Usage**: Current memory consumption
- **Database Health**: Connection status and query performance

### Automated Monitoring Setup

1. **CloudWatch Integration**: Metrics automatically logged in Lambda environment
2. **Custom Dashboards**: Use `/api/health/metrics` for custom monitoring
3. **Alerting**: Set up alerts based on error rate and response time thresholds

## Best Practices

### Pre-Deployment Testing

1. Run full test suite in staging environment
2. Validate all environment variables
3. Test with production-like data volumes
4. Verify SSL certificates and domain configuration

### Post-Deployment Validation

1. Run comprehensive validation immediately after deployment
2. Monitor health endpoints for 24 hours
3. Validate all user-facing features manually
4. Check performance under expected load

### Continuous Monitoring

1. Set up automated health checks every 5 minutes
2. Monitor key performance indicators (KPIs)
3. Configure alerts for degraded performance
4. Regular load testing to validate scalability

## Troubleshooting

### Debug Mode

Enable detailed logging by setting environment variables:

```bash
NODE_ENV=development  # Enables detailed error messages
DEBUG=*              # Enables debug logging
```

### Common Commands

```bash
# Check Lambda logs
npm run logs

# Test specific endpoint
curl -v https://your-api.com/api/health/detailed

# Validate environment
npm run validate-config

# Remove and redeploy
npm run deploy:remove && npm run deploy:lambda
```

### Performance Optimization

1. **Lambda Optimization**:

   - Use ARM64 architecture (20% cost savings)
   - Optimize memory allocation (256MB recommended)
   - Enable connection pooling for database

2. **Frontend Optimization**:

   - Enable gzip compression
   - Use CloudFront CDN
   - Optimize bundle size with code splitting

3. **Database Optimization**:
   - Use connection pooling
   - Optimize query performance
   - Enable read replicas for high traffic

## Support

For issues with the testing suite:

1. Check the test output for specific error messages
2. Review the application logs for detailed error information
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed and up to date

The testing suite is designed to provide clear, actionable feedback to help identify and resolve deployment issues quickly.
