# Health Check and Monitoring Guide

This guide covers the comprehensive health check and monitoring system implemented for the AWS cost-effective deployment.

## Overview

The health check system provides multiple layers of monitoring to ensure your application meets the performance and reliability requirements:

- **Response Time**: All API calls must respond within 2 seconds
- **Uptime**: System must maintain 99.5% uptime during high traffic
- **Availability**: Application must remain available and responsive
- **Cost Monitoring**: Monthly costs must stay under $5

## Health Check Endpoints

### Basic Health Checks

#### `/api/health`

- **Purpose**: Basic application health status
- **Response Time**: < 2 seconds
- **Returns**: Basic system information, uptime, and monitoring data

```bash
curl http://localhost:5001/api/health
```

#### `/api/health/basic`

- **Purpose**: Minimal health check for load balancers
- **Response Time**: < 1 second
- **Returns**: Simple status and uptime

### Comprehensive Monitoring

#### `/api/monitoring/health`

- **Purpose**: Comprehensive health assessment with alerts
- **Response Time**: < 2 seconds
- **Returns**: Detailed health status, performance metrics, and active alerts

#### `/api/monitoring/metrics`

- **Purpose**: Performance and system metrics
- **Returns**: Request counts, error rates, response times, system resources

#### `/api/monitoring/status`

- **Purpose**: Overall system status with component breakdown
- **Returns**: Component health, overall status, and health percentage

#### `/api/monitoring/alerts`

- **Purpose**: Active system alerts and warnings
- **Returns**: Critical, warning, and info level alerts

### Kubernetes-Style Probes

#### `/api/monitoring/ready`

- **Purpose**: Readiness probe for load balancers
- **Returns**: Whether the application is ready to serve traffic

#### `/api/monitoring/live`

- **Purpose**: Liveness probe for container orchestration
- **Returns**: Whether the application process is alive

### Cost Monitoring

#### `/api/monitoring/costs`

- **Purpose**: AWS cost tracking and budget monitoring
- **Returns**: Estimated monthly costs, request counts, and usage metrics

## Testing Scripts

### Quick Health Check

Fast validation of essential endpoints:

```bash
# Local testing
npm run health:quick

# Remote testing
node scripts/quick-health-check.js https://your-api-url.com
```

### Production Health Check

Comprehensive health validation with detailed reporting:

```bash
# Local testing
npm run health:production

# Remote testing
node scripts/production-health-check.js https://your-api-url.com
```

### Full Deployment Testing

Complete deployment validation including frontend and backend:

```bash
# Test entire deployment
node test-deployment.js https://your-api-url.com https://your-frontend-url.com
```

## Monitoring Features

### Automatic Metrics Collection

The system automatically collects:

- Request count and response times
- Error rates and types
- Memory and CPU usage
- Database connection status
- Lambda cold start rates (in AWS)

### Alert System

Alerts are generated for:

- **Critical**: Database disconnection, system failures
- **Warning**: High response times, elevated error rates, budget concerns
- **Info**: High traffic, system events

### Performance Thresholds

| Metric            | Threshold   | Alert Level |
| ----------------- | ----------- | ----------- |
| Response Time     | > 2 seconds | Warning     |
| Error Rate        | > 5%        | Warning     |
| Uptime            | < 99.5%     | Critical    |
| Memory Usage      | > 90%       | Critical    |
| Monthly Cost      | > $5        | Warning     |
| Database Response | > 1 second  | Warning     |

## Usage Examples

### Development Testing

```bash
# Start your server
npm run dev

# In another terminal, run quick health check
npm run health:quick
```

### Production Deployment Validation

```bash
# After deploying to AWS
export API_BASE_URL="https://your-lambda-url.amazonaws.com"
npm run health:production
```

### Continuous Monitoring

Set up automated health checks in your CI/CD pipeline:

```yaml
# Example GitHub Actions step
- name: Health Check
  run: |
    node scripts/production-health-check.js ${{ secrets.API_URL }}
```

### Load Testing

The health check system includes concurrent load testing:

```bash
# Test with 10 concurrent requests
node scripts/production-health-check.js https://your-api-url.com
```

## Integration with AWS

### CloudWatch Integration

When deployed to AWS Lambda, the system automatically:

- Logs metrics to CloudWatch
- Tracks Lambda cold starts
- Monitors memory and execution time
- Records cost-related metrics

### API Gateway Integration

Health endpoints work seamlessly with API Gateway:

- CORS is properly configured
- Rate limiting is applied
- Request/response logging is enabled

## Troubleshooting

### Common Issues

1. **Health check timeouts**

   - Check network connectivity
   - Verify API Gateway configuration
   - Review Lambda timeout settings

2. **Database connection failures**

   - Verify MongoDB connection string
   - Check network security groups
   - Ensure database is accessible from Lambda

3. **High response times**
   - Check Lambda memory allocation
   - Review database query performance
   - Monitor cold start frequency

### Debug Commands

```bash
# Check specific endpoint
curl -v https://your-api-url.com/api/monitoring/health

# Test with detailed output
DEBUG=* node scripts/production-health-check.js https://your-api-url.com

# Check Lambda logs (if deployed)
serverless logs -f api --tail
```

## Best Practices

1. **Regular Monitoring**: Run health checks after each deployment
2. **Alert Thresholds**: Adjust alert thresholds based on your traffic patterns
3. **Cost Monitoring**: Review cost metrics weekly to stay within budget
4. **Performance Optimization**: Use health metrics to identify optimization opportunities
5. **Documentation**: Keep health check results for trend analysis

## Security Considerations

- Health endpoints don't expose sensitive information
- Authentication is not required for basic health checks
- Detailed system information is only available in development mode
- Cost information is aggregated and doesn't include account details

## Next Steps

1. Set up automated health monitoring in your deployment pipeline
2. Configure alerting based on your operational requirements
3. Integrate with external monitoring services (e.g., DataDog, New Relic)
4. Create custom dashboards using the metrics endpoints
5. Implement automated scaling based on health metrics
