#!/bin/bash

echo "🔍 Checking Lambda function logs..."

# Get recent logs from the Lambda function
aws logs tail /aws/lambda/campus-vibe-server-prod-api --follow --since 5m