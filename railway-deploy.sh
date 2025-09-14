#!/bin/bash

echo "🚂 Deploying to Railway (free and simple)..."

# Install Railway CLI if not installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login and deploy
echo "Please run these commands:"
echo "1. railway login"
echo "2. railway init"
echo "3. railway up"

echo ""
echo "Railway will automatically:"
echo "- Build your Node.js app"
echo "- Give you a public URL"
echo "- Handle all the deployment complexity"
echo ""
echo "Much simpler than AWS Lambda!"