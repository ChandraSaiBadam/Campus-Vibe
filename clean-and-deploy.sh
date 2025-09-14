#!/bin/bash

echo "🧹 Cleaning up to reduce package size..."

# Clean server node_modules
cd server
rm -rf node_modules
npm install --production --no-optional
cd ..

echo "🚀 Deploying with optimized package..."
serverless deploy --stage prod --verbose