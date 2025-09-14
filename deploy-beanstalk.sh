#!/bin/bash

echo "🚀 Deploying to AWS Elastic Beanstalk (much simpler approach)..."

# Create application bundle
cd server
zip -r ../campus-vibe-app.zip . -x "node_modules/*" "*.log" ".env*"
cd ..

# Create Elastic Beanstalk application
aws elasticbeanstalk create-application \
  --application-name campus-vibe \
  --description "Campus Vibe Application"

# Create environment
aws elasticbeanstalk create-environment \
  --application-name campus-vibe \
  --environment-name campus-vibe-prod \
  --solution-stack-name "64bit Amazon Linux 2 v5.8.4 running Node.js 18" \
  --option-settings \
    Namespace=aws:autoscaling:launchconfiguration,OptionName=InstanceType,Value=t3.micro \
    Namespace=aws:elasticbeanstalk:environment,OptionName=EnvironmentType,Value=SingleInstance

echo "✅ Beanstalk environment created! Uploading application..."

# Create application version
aws elasticbeanstalk create-application-version \
  --application-name campus-vibe \
  --version-label v1.0 \
  --source-bundle S3Bucket=elasticbeanstalk-us-east-1-$(aws sts get-caller-identity --query Account --output text),S3Key=campus-vibe-app.zip

# Upload to S3 first
aws s3 cp campus-vibe-app.zip s3://elasticbeanstalk-us-east-1-$(aws sts get-caller-identity --query Account --output text)/

# Deploy
aws elasticbeanstalk update-environment \
  --environment-name campus-vibe-prod \
  --version-label v1.0

echo "🎉 Deployment started! Check AWS Console for progress."