#!/bin/bash

echo "🔧 Installing missing serverless plugin..."
cd server
npm install serverless-dotenv-plugin@^6.0.0
cd ..

echo "🚀 Starting deployment..."
./scripts/deploy-complete.sh -m csb2607@gmail.com