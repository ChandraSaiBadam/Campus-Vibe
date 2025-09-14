/**
 * CloudWatch Dashboard Configuration
 *
 * This module provides configuration for CloudWatch dashboards
 * to visualize application performance and cost metrics.
 *
 * Requirements addressed:
 * - 3.1: Basic metrics collection automatically
 * - 3.4: Cost monitoring with dashboards
 */

/**
 * Generate CloudWatch dashboard configuration
 * @param {string} functionName - Lambda function name
 * @param {string} apiGatewayId - API Gateway ID
 * @param {string} region - AWS region
 */
const generateDashboardConfig = (
  functionName,
  apiGatewayId,
  region = "us-east-1"
) => {
  return {
    widgets: [
      // Lambda Performance Metrics
      {
        type: "metric",
        x: 0,
        y: 0,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ["AWS/Lambda", "Invocations", "FunctionName", functionName],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."],
            [".", "Throttles", ".", "."],
          ],
          view: "timeSeries",
          stacked: false,
          region: region,
          title: "Lambda Performance Metrics",
          period: 300,
          stat: "Sum",
          yAxis: {
            left: {
              min: 0,
            },
          },
        },
      },

      // API Gateway Metrics
      {
        type: "metric",
        x: 12,
        y: 0,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ["AWS/ApiGateway", "Count", "ApiName", functionName],
            [".", "4XXError", ".", "."],
            [".", "5XXError", ".", "."],
            [".", "Latency", ".", "."],
          ],
          view: "timeSeries",
          stacked: false,
          region: region,
          title: "API Gateway Metrics",
          period: 300,
          stat: "Sum",
        },
      },

      // Custom Application Metrics
      {
        type: "metric",
        x: 0,
        y: 6,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ["CampusVibe/Application", "ApiRequests", "Method", "GET"],
            ["...", "POST"],
            ["...", "PUT"],
            ["...", "DELETE"],
            [".", "ApiErrors", "StatusClass", "4xx"],
            ["...", "5xx"],
          ],
          view: "timeSeries",
          stacked: false,
          region: region,
          title: "Application Request Metrics",
          period: 300,
          stat: "Sum",
        },
      },

      // Cost and Usage Metrics
      {
        type: "metric",
        x: 12,
        y: 6,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            [
              "CampusVibe/Application",
              "EstimatedMonthlyCost",
              "Service",
              "CampusVibe",
            ],
            [".", "BudgetUtilization", ".", "."],
            [".", "LambdaRequestsFreeTierUtilization", ".", "."],
            [".", "ApiGatewayFreeTierUtilization", ".", "."],
          ],
          view: "timeSeries",
          stacked: false,
          region: region,
          title: "Cost and Budget Metrics",
          period: 300,
          stat: "Average",
          yAxis: {
            left: {
              min: 0,
              max: 100,
            },
          },
        },
      },

      // Memory and Performance
      {
        type: "metric",
        x: 0,
        y: 12,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            [
              "CampusVibe/Application",
              "MemoryHeapUsed",
              "FunctionName",
              functionName,
            ],
            [".", "MemoryUtilization", ".", "."],
            [".", "ApiResponseTime", "Method", "GET"],
            [".", "DatabaseResponseTime", "Operation", "find"],
          ],
          view: "timeSeries",
          stacked: false,
          region: region,
          title: "Memory and Response Time Metrics",
          period: 300,
          stat: "Average",
        },
      },

      // Database Operations
      {
        type: "metric",
        x: 12,
        y: 12,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            [
              "CampusVibe/Application",
              "DatabaseOperations",
              "Operation",
              "find",
            ],
            ["...", "create"],
            ["...", "update"],
            ["...", "delete"],
            [".", "DatabaseErrors", "Success", "false"],
          ],
          view: "timeSeries",
          stacked: false,
          region: region,
          title: "Database Operation Metrics",
          period: 300,
          stat: "Sum",
        },
      },

      // Cost Breakdown Table
      {
        type: "metric",
        x: 0,
        y: 18,
        width: 24,
        height: 6,
        properties: {
          metrics: [
            [
              "CampusVibe/Application",
              "LambdaRequests",
              "Service",
              "CampusVibe",
            ],
            [".", "LambdaGBSeconds", ".", "."],
            [".", "ApiGatewayRequests", ".", "."],
            [".", "EstimatedMonthlyCost", ".", "."],
          ],
          view: "table",
          region: region,
          title: "Monthly Usage Summary",
          period: 2592000, // 30 days
          stat: "Sum",
        },
      },
    ],
  };
};

/**
 * Generate alarm configuration for cost monitoring
 * @param {string} functionName - Lambda function name
 * @param {string} snsTopicArn - SNS topic ARN for notifications
 * @param {number} budgetLimit - Monthly budget limit in USD
 */
const generateAlarmConfig = (functionName, snsTopicArn, budgetLimit = 50) => {
  return [
    // Budget utilization warning (80%)
    {
      AlarmName: `${functionName}-BudgetWarning`,
      AlarmDescription: "Budget utilization has reached 80%",
      MetricName: "BudgetUtilization",
      Namespace: "CampusVibe/Application",
      Statistic: "Average",
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 80,
      ComparisonOperator: "GreaterThanThreshold",
      AlarmActions: [snsTopicArn],
      Dimensions: [
        {
          Name: "Service",
          Value: "CampusVibe",
        },
      ],
    },

    // Budget utilization critical (95%)
    {
      AlarmName: `${functionName}-BudgetCritical`,
      AlarmDescription: "Budget utilization has reached 95%",
      MetricName: "BudgetUtilization",
      Namespace: "CampusVibe/Application",
      Statistic: "Average",
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 95,
      ComparisonOperator: "GreaterThanThreshold",
      AlarmActions: [snsTopicArn],
      Dimensions: [
        {
          Name: "Service",
          Value: "CampusVibe",
        },
      ],
    },

    // High error rate
    {
      AlarmName: `${functionName}-HighErrorRate`,
      AlarmDescription: "API error rate is above 5%",
      MetricName: "ApiErrors",
      Namespace: "CampusVibe/Application",
      Statistic: "Sum",
      Period: 300,
      EvaluationPeriods: 2,
      Threshold: 50,
      ComparisonOperator: "GreaterThanThreshold",
      AlarmActions: [snsTopicArn],
      Dimensions: [
        {
          Name: "StatusClass",
          Value: "5xx",
        },
      ],
    },

    // High response time
    {
      AlarmName: `${functionName}-HighResponseTime`,
      AlarmDescription: "API response time is above 2 seconds",
      MetricName: "ApiResponseTime",
      Namespace: "CampusVibe/Application",
      Statistic: "Average",
      Period: 300,
      EvaluationPeriods: 2,
      Threshold: 2000,
      ComparisonOperator: "GreaterThanThreshold",
      AlarmActions: [snsTopicArn],
    },

    // Lambda function errors
    {
      AlarmName: `${functionName}-LambdaErrors`,
      AlarmDescription: "Lambda function error rate is high",
      MetricName: "Errors",
      Namespace: "AWS/Lambda",
      Statistic: "Sum",
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 10,
      ComparisonOperator: "GreaterThanThreshold",
      AlarmActions: [snsTopicArn],
      Dimensions: [
        {
          Name: "FunctionName",
          Value: functionName,
        },
      ],
    },

    // Lambda function throttles
    {
      AlarmName: `${functionName}-LambdaThrottles`,
      AlarmDescription: "Lambda function is being throttled",
      MetricName: "Throttles",
      Namespace: "AWS/Lambda",
      Statistic: "Sum",
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: "GreaterThanThreshold",
      AlarmActions: [snsTopicArn],
      Dimensions: [
        {
          Name: "FunctionName",
          Value: functionName,
        },
      ],
    },
  ];
};

/**
 * Generate log insights queries for troubleshooting
 */
const getLogInsightsQueries = () => {
  return {
    // Error analysis
    errorAnalysis: `
      fields @timestamp, @message, level, error, lambda.requestId
      | filter level = "ERROR"
      | sort @timestamp desc
      | limit 100
    `,

    // Performance analysis
    performanceAnalysis: `
      fields @timestamp, @message, duration, lambda.remainingTime, performance.heapUsed
      | filter @message like /Lambda Response Completed/
      | sort @timestamp desc
      | limit 100
    `,

    // Cost analysis
    costAnalysis: `
      fields @timestamp, @message, estimatedCost, gbSeconds, memoryMB
      | filter @message like /Cost Metrics/
      | sort @timestamp desc
      | limit 100
    `,

    // API request analysis
    apiAnalysis: `
      fields @timestamp, @message, method, route, statusCode, duration
      | filter @message like /API Request/
      | sort @timestamp desc
      | limit 100
    `,

    // Database operation analysis
    databaseAnalysis: `
      fields @timestamp, @message, operation, collection, duration, success
      | filter @message like /Database Operation/
      | sort @timestamp desc
      | limit 100
    `,
  };
};

module.exports = {
  generateDashboardConfig,
  generateAlarmConfig,
  getLogInsightsQueries,
};
