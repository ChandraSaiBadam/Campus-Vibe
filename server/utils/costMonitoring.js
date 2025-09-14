/**
 * Cost Monitoring and Alerting Utility
 *
 * This module provides cost tracking, budget monitoring, and alerting
 * capabilities for AWS Lambda and API Gateway usage.
 *
 * Requirements addressed:
 * - 3.4: Cost monitoring with notifications when costs exceed thresholds
 */

const AWS = require("aws-sdk");
const { logToCloudWatch, putMetric } = require("./monitoring");

// Initialize AWS services (only in Lambda environment)
let cloudWatch = null;
let sns = null;

if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  cloudWatch = new AWS.CloudWatch({
    region: process.env.AWS_REGION || "us-east-1",
  });

  sns = new AWS.SNS({
    region: process.env.AWS_REGION || "us-east-1",
  });
}

/**
 * Cost tracking configuration
 */
const COST_CONFIG = {
  // Monthly budget limits (in USD)
  MONTHLY_BUDGET: parseFloat(process.env.MONTHLY_BUDGET) || 50.0,
  WARNING_THRESHOLD: 0.8, // 80% of budget
  CRITICAL_THRESHOLD: 0.95, // 95% of budget

  // AWS pricing (approximate, as of 2024)
  LAMBDA_COST_PER_GB_SECOND: 0.0000166667,
  LAMBDA_COST_PER_REQUEST: 0.0000002,
  API_GATEWAY_COST_PER_REQUEST: 0.0000035,

  // Free tier limits
  LAMBDA_FREE_REQUESTS: 1000000, // 1M requests per month
  LAMBDA_FREE_GB_SECONDS: 400000, // 400K GB-seconds per month
  API_GATEWAY_FREE_REQUESTS: 1000000, // 1M requests per month
};

/**
 * Track monthly usage and costs
 */
class CostTracker {
  constructor() {
    this.monthlyUsage = {
      lambdaRequests: 0,
      lambdaGBSeconds: 0,
      apiGatewayRequests: 0,
      estimatedCost: 0,
      lastReset: new Date().getMonth(),
    };

    this.loadUsageFromStorage();
  }

  /**
   * Load usage data from environment or storage
   */
  loadUsageFromStorage() {
    try {
      // In a real implementation, this would load from DynamoDB or S3
      // For now, we'll use environment variables or start fresh each month
      const currentMonth = new Date().getMonth();

      if (this.monthlyUsage.lastReset !== currentMonth) {
        this.resetMonthlyUsage();
      }
    } catch (error) {
      console.error("Failed to load usage data:", error);
      this.resetMonthlyUsage();
    }
  }

  /**
   * Reset monthly usage counters
   */
  resetMonthlyUsage() {
    this.monthlyUsage = {
      lambdaRequests: 0,
      lambdaGBSeconds: 0,
      apiGatewayRequests: 0,
      estimatedCost: 0,
      lastReset: new Date().getMonth(),
    };

    logToCloudWatch("INFO", "Monthly usage reset", {
      month: new Date().toISOString().substring(0, 7),
      budget: COST_CONFIG.MONTHLY_BUDGET,
    });
  }

  /**
   * Track Lambda execution
   * @param {number} durationMs - Execution duration in milliseconds
   * @param {number} memoryMB - Memory allocation in MB
   */
  trackLambdaExecution(durationMs, memoryMB) {
    this.monthlyUsage.lambdaRequests += 1;

    const durationSeconds = durationMs / 1000;
    const gbSeconds = (memoryMB / 1024) * durationSeconds;
    this.monthlyUsage.lambdaGBSeconds += gbSeconds;

    // Calculate costs (only charge for usage above free tier)
    const billableRequests = Math.max(
      0,
      this.monthlyUsage.lambdaRequests - COST_CONFIG.LAMBDA_FREE_REQUESTS
    );
    const billableGBSeconds = Math.max(
      0,
      this.monthlyUsage.lambdaGBSeconds - COST_CONFIG.LAMBDA_FREE_GB_SECONDS
    );

    const requestCost = billableRequests * COST_CONFIG.LAMBDA_COST_PER_REQUEST;
    const computeCost =
      billableGBSeconds * COST_CONFIG.LAMBDA_COST_PER_GB_SECOND;

    this.monthlyUsage.estimatedCost = requestCost + computeCost;

    // Send metrics to CloudWatch
    this.sendCostMetrics();

    // Check for budget alerts
    this.checkBudgetAlerts();
  }

  /**
   * Track API Gateway request
   */
  trackApiGatewayRequest() {
    this.monthlyUsage.apiGatewayRequests += 1;

    // Calculate API Gateway costs (only charge for usage above free tier)
    const billableRequests = Math.max(
      0,
      this.monthlyUsage.apiGatewayRequests -
        COST_CONFIG.API_GATEWAY_FREE_REQUESTS
    );
    const apiGatewayCost =
      billableRequests * COST_CONFIG.API_GATEWAY_COST_PER_REQUEST;

    // Add to total estimated cost
    this.monthlyUsage.estimatedCost += apiGatewayCost;

    // Send metrics to CloudWatch
    this.sendCostMetrics();

    // Check for budget alerts
    this.checkBudgetAlerts();
  }

  /**
   * Send cost metrics to CloudWatch
   */
  async sendCostMetrics() {
    try {
      const dimensions = [
        { Name: "Service", Value: "CampusVibe" },
        { Name: "Month", Value: new Date().toISOString().substring(0, 7) },
      ];

      // Send usage metrics
      await putMetric(
        "LambdaRequests",
        this.monthlyUsage.lambdaRequests,
        "Count",
        dimensions
      );
      await putMetric(
        "LambdaGBSeconds",
        this.monthlyUsage.lambdaGBSeconds,
        "Count",
        dimensions
      );
      await putMetric(
        "ApiGatewayRequests",
        this.monthlyUsage.apiGatewayRequests,
        "Count",
        dimensions
      );
      await putMetric(
        "EstimatedMonthlyCost",
        this.monthlyUsage.estimatedCost,
        "Count",
        dimensions
      );

      // Calculate budget utilization
      const budgetUtilization =
        (this.monthlyUsage.estimatedCost / COST_CONFIG.MONTHLY_BUDGET) * 100;
      await putMetric(
        "BudgetUtilization",
        budgetUtilization,
        "Percent",
        dimensions
      );

      // Calculate free tier utilization
      const lambdaRequestUtilization =
        (this.monthlyUsage.lambdaRequests / COST_CONFIG.LAMBDA_FREE_REQUESTS) *
        100;
      const lambdaComputeUtilization =
        (this.monthlyUsage.lambdaGBSeconds /
          COST_CONFIG.LAMBDA_FREE_GB_SECONDS) *
        100;
      const apiGatewayUtilization =
        (this.monthlyUsage.apiGatewayRequests /
          COST_CONFIG.API_GATEWAY_FREE_REQUESTS) *
        100;

      await putMetric(
        "LambdaRequestsFreeTierUtilization",
        lambdaRequestUtilization,
        "Percent",
        dimensions
      );
      await putMetric(
        "LambdaComputeFreeTierUtilization",
        lambdaComputeUtilization,
        "Percent",
        dimensions
      );
      await putMetric(
        "ApiGatewayFreeTierUtilization",
        apiGatewayUtilization,
        "Percent",
        dimensions
      );
    } catch (error) {
      console.error("Failed to send cost metrics:", error);
    }
  }

  /**
   * Check budget alerts and send notifications
   */
  async checkBudgetAlerts() {
    const budgetUtilization =
      this.monthlyUsage.estimatedCost / COST_CONFIG.MONTHLY_BUDGET;

    try {
      // Critical alert (95% of budget)
      if (budgetUtilization >= COST_CONFIG.CRITICAL_THRESHOLD) {
        await this.sendBudgetAlert("CRITICAL", budgetUtilization);
      }
      // Warning alert (80% of budget)
      else if (budgetUtilization >= COST_CONFIG.WARNING_THRESHOLD) {
        await this.sendBudgetAlert("WARNING", budgetUtilization);
      }
    } catch (error) {
      console.error("Failed to check budget alerts:", error);
    }
  }

  /**
   * Send budget alert notification
   * @param {string} severity - Alert severity (WARNING, CRITICAL)
   * @param {number} utilization - Budget utilization percentage
   */
  async sendBudgetAlert(severity, utilization) {
    const message = {
      severity,
      timestamp: new Date().toISOString(),
      budgetUtilization: `${(utilization * 100).toFixed(1)}%`,
      estimatedCost: `$${this.monthlyUsage.estimatedCost.toFixed(4)}`,
      monthlyBudget: `$${COST_CONFIG.MONTHLY_BUDGET}`,
      usage: {
        lambdaRequests: this.monthlyUsage.lambdaRequests,
        lambdaGBSeconds: this.monthlyUsage.lambdaGBSeconds.toFixed(2),
        apiGatewayRequests: this.monthlyUsage.apiGatewayRequests,
      },
      freeTierStatus: {
        lambdaRequests: `${(
          (this.monthlyUsage.lambdaRequests /
            COST_CONFIG.LAMBDA_FREE_REQUESTS) *
          100
        ).toFixed(1)}%`,
        lambdaCompute: `${(
          (this.monthlyUsage.lambdaGBSeconds /
            COST_CONFIG.LAMBDA_FREE_GB_SECONDS) *
          100
        ).toFixed(1)}%`,
        apiGateway: `${(
          (this.monthlyUsage.apiGatewayRequests /
            COST_CONFIG.API_GATEWAY_FREE_REQUESTS) *
          100
        ).toFixed(1)}%`,
      },
    };

    // Log the alert
    logToCloudWatch("WARN", `Budget Alert - ${severity}`, message);

    // Send SNS notification if configured
    if (sns && process.env.COST_ALERT_TOPIC_ARN) {
      try {
        const snsMessage = {
          Subject: `Campus Vibe - ${severity} Budget Alert`,
          Message: JSON.stringify(message, null, 2),
          TopicArn: process.env.COST_ALERT_TOPIC_ARN,
        };

        await sns.publish(snsMessage).promise();
      } catch (error) {
        console.error("Failed to send SNS alert:", error);
      }
    }

    // Send CloudWatch alarm metric
    await putMetric(`BudgetAlert${severity}`, 1, "Count", [
      { Name: "Severity", Value: severity },
      { Name: "Month", Value: new Date().toISOString().substring(0, 7) },
    ]);
  }

  /**
   * Get current usage summary
   */
  getUsageSummary() {
    const budgetUtilization =
      (this.monthlyUsage.estimatedCost / COST_CONFIG.MONTHLY_BUDGET) * 100;

    return {
      month: new Date().toISOString().substring(0, 7),
      budget: {
        limit: COST_CONFIG.MONTHLY_BUDGET,
        used: this.monthlyUsage.estimatedCost,
        utilization: `${budgetUtilization.toFixed(1)}%`,
        remaining: COST_CONFIG.MONTHLY_BUDGET - this.monthlyUsage.estimatedCost,
      },
      usage: {
        lambda: {
          requests: this.monthlyUsage.lambdaRequests,
          gbSeconds: this.monthlyUsage.lambdaGBSeconds.toFixed(2),
          freeTierUtilization: `${(
            (this.monthlyUsage.lambdaRequests /
              COST_CONFIG.LAMBDA_FREE_REQUESTS) *
            100
          ).toFixed(1)}%`,
        },
        apiGateway: {
          requests: this.monthlyUsage.apiGatewayRequests,
          freeTierUtilization: `${(
            (this.monthlyUsage.apiGatewayRequests /
              COST_CONFIG.API_GATEWAY_FREE_REQUESTS) *
            100
          ).toFixed(1)}%`,
        },
      },
      projectedMonthlyCost: this.projectMonthlyCost(),
    };
  }

  /**
   * Project monthly cost based on current usage
   */
  projectMonthlyCost() {
    const currentDate = new Date();
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();
    const dayOfMonth = currentDate.getDate();

    const projectionMultiplier = daysInMonth / dayOfMonth;
    const projectedCost =
      this.monthlyUsage.estimatedCost * projectionMultiplier;

    return {
      current: this.monthlyUsage.estimatedCost,
      projected: projectedCost,
      daysRemaining: daysInMonth - dayOfMonth,
      onTrackForBudget: projectedCost <= COST_CONFIG.MONTHLY_BUDGET,
    };
  }
}

// Global cost tracker instance
const costTracker = new CostTracker();

/**
 * Middleware to track API Gateway costs
 */
const costTrackingMiddleware = () => {
  return (req, res, next) => {
    // Track API Gateway request
    costTracker.trackApiGatewayRequest();
    next();
  };
};

/**
 * Track Lambda execution costs
 * @param {Object} context - Lambda context
 * @param {number} duration - Execution duration in milliseconds
 */
const trackLambdaCost = (context, duration) => {
  if (context && context.memoryLimitInMB) {
    costTracker.trackLambdaExecution(duration, context.memoryLimitInMB);
  }
};

/**
 * Get cost dashboard data
 */
const getCostDashboard = () => {
  return costTracker.getUsageSummary();
};

module.exports = {
  CostTracker,
  costTracker,
  costTrackingMiddleware,
  trackLambdaCost,
  getCostDashboard,
  COST_CONFIG,
};
